import { createClient } from "npm:@supabase/supabase-js@2";

const origins = new Set(["https://luxtime.vn", "https://www.luxtime.vn"]);
const fallback = "Mình chưa có đủ thông tin để trả lời chính xác. Bạn vui lòng nhắn Facebook để LUXTIME hỗ trợ trực tiếp nhé.";

function reply(origin: string, body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origins.has(origin) ? origin : "https://luxtime.vn",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    },
  });
}

const instructions = `Bạn là trợ lý tự động của LUXTIME, cửa hàng thu mua, bán và nhận bán hộ đồng hồ cao cấp tại Nhật Bản. Trả lời ngắn gọn, lịch sự bằng tiếng Việt (hoặc ngôn ngữ khách dùng). Chỉ dùng thông tin sau:
- Giá thu mua dự kiến được tra bằng mã Reference tại https://luxtime.vn/#buy. Giá chính xác cần nhân viên kiểm tra đồng hồ, tình trạng, phụ kiện và thị trường.
- Hàng có sẵn ở https://luxtime.vn/#available. Cần nhân viên xác nhận còn hàng và giá trước giao dịch.
- Bán hộ: khách giữ quyền sở hữu, LUXTIME hỗ trợ đăng bán; phí được thỏa thuận trước khi đăng.
- Khách có thể gửi thông tin và ảnh đồng hồ trong biểu mẫu trên trang, hoặc liên hệ qua Facebook trên website.
Không bịa giá, tồn kho, địa chỉ, lịch hẹn, thời gian thanh toán, phí hay chính sách chưa có ở trên. Không tự nhận là nhân viên. Nếu câu hỏi ngoài thông tin, nói chưa có đủ thông tin và hướng dẫn khách nhắn Facebook. Không yêu cầu mật khẩu, thông tin thẻ hoặc tài liệu nhạy cảm. Tối đa 100 từ.`;

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin") || "";
  if (request.method === "OPTIONS") return reply(origin, {});
  if (request.method !== "POST") return reply(origin, { error: "Phương thức không hợp lệ." }, 405);
  if (!origins.has(origin)) return reply(origin, { error: "Nguồn truy cập không hợp lệ." }, 403);
  if (Number(request.headers.get("Content-Length") || 0) > 6000) {
    return reply(origin, { error: "Câu hỏi quá dài." }, 413);
  }

  try {
    const data = await request.json();
    if (!Array.isArray(data.messages) || data.messages.length < 1 || data.messages.length > 7 ||
      data.messages.some((message: unknown) =>
        !message || typeof message !== "object" ||
        !["user", "assistant"].includes((message as { role: string }).role) ||
        typeof (message as { content: unknown }).content !== "string" ||
        (message as { content: string }).content.length > 500
      ) || data.messages.at(-1).role !== "user") {
      return reply(origin, { error: "Câu hỏi không hợp lệ." }, 400);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return reply(origin, { answer: fallback, link: "facebook" });

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const salt = Deno.env.get("CHAT_HASH_SALT");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!salt || !supabaseUrl || !serviceKey) {
      return reply(origin, { answer: fallback, link: "facebook" });
    }
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
    const visitorKey = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: allowed, error: quotaError } = await client.rpc("reserve_website_chat_request", {
      p_visitor_key: visitorKey,
    });
    if (quotaError || allowed !== true) {
      return reply(origin, { answer: "Trợ lý đã hết lượt trả lời tự động hôm nay. Bạn vui lòng nhắn Facebook để được hỗ trợ.", link: "facebook" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: Deno.env.get("OPENAI_CHAT_MODEL") || "gpt-4o-mini",
          instructions,
          input: data.messages,
          max_output_tokens: 200,
          store: false,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error(`AI HTTP ${response.status}`);
    const result = await response.json();
    const answer = result.output?.flatMap((item: { content?: { type: string; text?: string }[] }) =>
      item.content?.filter((part) => part.type === "output_text").map((part) => part.text || "") || []
    ).join(" ").trim();
    return reply(origin, { answer: answer || fallback, link: answer ? undefined : "facebook" });
  } catch (error) {
    console.error("Website chat unavailable:", error instanceof Error ? error.message : "Unknown error");
    return reply(origin, { answer: fallback, link: "facebook" });
  }
});

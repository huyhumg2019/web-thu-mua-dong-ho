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

const instructions = `Bạn là trợ lý tự động của LUXTIME, cửa hàng thu mua, bán và nhận bán hộ đồng hồ cao cấp tại Nhật Bản. Trả lời thân thiện, ngắn gọn bằng tiếng Việt (hoặc ngôn ngữ khách dùng), giúp khách chọn đúng mục trên web. Chỉ dùng thông tin sau và dữ liệu danh mục đính kèm:
- Giá thu mua dự kiến được tra bằng mã Reference tại https://luxtime.vn/#buy. Giá chính xác cần nhân viên kiểm tra đồng hồ, tình trạng, phụ kiện và thị trường.
- Hàng có sẵn ở https://luxtime.vn/#available. Cần nhân viên xác nhận còn hàng và giá trước giao dịch.
- Bán hộ: khách giữ quyền sở hữu, LUXTIME hỗ trợ đăng bán; phí được thỏa thuận trước khi đăng.
- Khách có thể gửi thông tin và ảnh đồng hồ trong biểu mẫu trên trang, hoặc liên hệ qua Facebook trên website.
Khi khách muốn bán đồng hồ, nêu các dòng thu mua phù hợp trong dữ liệu đính kèm; chỉ gọi là được xem nhiều nếu lượt xem 30 ngày > 0. Nói khách có thể mở đường dẫn danh mục ngay bên dưới câu trả lời, tìm Reference và gửi ảnh/thông tin để nhận tư vấn. Không bịa giá, tồn kho, địa chỉ, lịch hẹn, thời gian thanh toán, phí hay chính sách chưa có ở trên. Không tự nhận là nhân viên. Nếu câu hỏi ngoài thông tin, nói chưa có đủ thông tin và hướng dẫn khách nhắn Facebook. Không yêu cầu mật khẩu, thông tin thẻ hoặc tài liệu nhạy cảm. Tối đa 100 từ.`;

const brandNames = { rolex: "Rolex", patek: "Patek Philippe", ap: "Audemars Piguet" } as const;
type BrandSlug = keyof typeof brandNames;
const visibleFamilies: Record<BrandSlug, string[]> = {
  rolex: ["Datejust", "Submariner", "Cosmograph Daytona", "GMT-Master II", "Day-Date", "Oyster Perpetual", "Yacht-Master", "Sea-Dweller / Deepsea", "Air-King", "Explorer", "Sky-Dweller"],
  patek: ["Nautilus", "Aquanaut"],
  ap: ["Royal Oak", "Royal Oak Offshore"],
};

function visibleFamily(brand: BrandSlug, family: string) {
  if (brand === "rolex") {
    if (family === "Submariner Date") return "Submariner";
    if (family === "Sea-Dweller" || family === "Deepsea") return "Sea-Dweller / Deepsea";
    if (family === "Explorer II") return "Explorer";
  }
  return visibleFamilies[brand].includes(family) ? family : null;
}

function requestedBrand(question: string): BrandSlug | null {
  if (/rolex/i.test(question)) return "rolex";
  if (/patek|nautilus|aquanaut/i.test(question)) return "patek";
  if (/audemars|royal oak|\bap\b/i.test(question)) return "ap";
  return null;
}

function isPurchaseQuestion(question: string) {
  return /thu mua|bán|báo giá|định giá|reference|mã ref|đồng hồ|rolex|patek|audemars|nautilus|aquanaut|royal oak/i.test(question);
}

async function purchaseContext(client: ReturnType<typeof createClient>, question: string) {
  if (!isPurchaseQuestion(question)) return { context: "", links: [] };
  const brand = requestedBrand(question);
  const query = client.from("purchase_catalog_variants").select("reference,brand,family,model").limit(1000);
  const [catalogResult, popularityResult] = await Promise.all([
    brand ? query.eq("brand", brandNames[brand]) : query,
    client.rpc("get_family_popularity"),
  ]);
  if (catalogResult.error || popularityResult.error) {
    console.error("Website chat catalog unavailable:", catalogResult.error?.message || popularityResult.error?.message);
    return { context: "", links: [] };
  }

  const views = new Map((popularityResult.data || []).map((row: { brand_slug: string; family_name: string; views: number }) =>
    [`${row.brand_slug}:${row.family_name}`, Number(row.views)]));
  const families = new Map<string, { brand: BrandSlug; family: string; references: Set<string>; views: number }>();
  for (const row of catalogResult.data || []) {
    const slug = (Object.keys(brandNames) as BrandSlug[]).find((name) => brandNames[name] === row.brand);
    if (!slug || !row.family) continue;
    const family = visibleFamily(slug, row.family);
    if (!family) continue;
    const key = `${slug}:${family}`;
    if (!families.has(key)) families.set(key, {
      brand: slug, family, references: new Set(), views: views.get(key) || 0,
    });
    if (row.reference) families.get(key)?.references.add(row.reference);
  }
  const ranked = [...families.values()].sort((a, b) => b.views - a.views || a.family.localeCompare(b.family)).slice(0, 3);
  const links = [
    ...(brand ? [{ text: `Xem thu mua ${brandNames[brand]}`, href: `https://luxtime.vn/?buy_brand=${brand}#buy` }]
      : [{ text: "Xem các thương hiệu thu mua", href: "https://luxtime.vn/#buy" }]),
    ...ranked.map((item) => ({
      text: `${brandNames[item.brand]} ${item.family}`,
      href: `https://luxtime.vn/?buy_brand=${item.brand}&buy_family=${encodeURIComponent(item.family)}#buy`,
    })),
  ];
  const context = ranked.length ? `Dữ liệu công khai trên luxtime.vn, lượt xem trong 30 ngày (0 nghĩa là chưa có số lượt xem): ${ranked.map((item) =>
    `${brandNames[item.brand]} ${item.family}: ${item.views} lượt, các Reference ${[...item.references].slice(0, 3).join(", ")}`
  ).join("; ")}. Danh mục giá chỉ là giá dự kiến, không khẳng định giá chốt.` : "Chưa có dữ liệu danh mục phù hợp.";
  return { context, links };
}

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
    const question = data.messages.at(-1).content as string;
    const { context, links } = await purchaseContext(client, question);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: Deno.env.get("OPENAI_CHAT_MODEL") || "gpt-4o-mini",
          instructions: context ? `${instructions}\n\n${context}` : instructions,
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
    return reply(origin, { answer: answer || fallback, links: answer ? links : [], link: answer ? undefined : "facebook" });
  } catch (error) {
    console.error("Website chat unavailable:", error instanceof Error ? error.message : "Unknown error");
    return reply(origin, { answer: fallback, link: "facebook" });
  }
});

import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://luxtime.vn",
  "https://www.luxtime.vn",
]);

function reply(request: Request, body: object, status = 200) {
  const origin = request.headers.get("Origin") || "";
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://luxtime.vn",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return reply(request, {});
  if (request.method !== "POST") return reply(request, { error: "Phương thức không hợp lệ." }, 405);

  const token = request.headers.get("Authorization")?.replace(/^Bearer /i, "");
  if (!token) return reply(request, { error: "Cần đăng nhập admin." }, 401);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const serverClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) return reply(request, { error: "Phiên đăng nhập không hợp lệ." }, 401);
    const { data: profile, error: profileError } = await serverClient
      .from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== "admin") {
      return reply(request, { error: "Chỉ admin được mời nhân viên." }, 403);
    }

    const input = await request.json();
    const name = String(input.name || "").trim();
    const email = String(input.email || "").trim().toLowerCase();
    if (name.length < 2 || name.length > 120 ||
        email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply(request, { error: "Vui lòng nhập họ tên và email hợp lệ." }, 400);
    }

    const { data: invitation, error: inviteError } = await serverClient.auth.admin
      .inviteUserByEmail(email, {
        data: { full_name: name },
        redirectTo: "https://luxtime.vn/admin.html?staff_invite=1",
      });
    if (inviteError) {
      console.error("Invite staff failed:", inviteError);
      return reply(request, { error: "Không thể gửi lời mời. Email có thể đã có tài khoản hoặc đã vượt giới hạn gửi thư." }, 400);
    }
    if (!invitation.user?.id) throw new Error("Invitation user ID missing");

    const { error: roleError } = await serverClient.from("profiles").upsert({
      id: invitation.user.id,
      full_name: name,
      role: "staff",
    }, { onConflict: "id" });
    if (roleError) {
      console.error("Invite sent but staff role failed:", roleError);
      return reply(request, { error: "Đã gửi email nhưng chưa cấp được quyền nhân viên. Hãy kiểm tra Supabase trước khi người nhận đăng nhập." }, 500);
    }

    return reply(request, { invited: true });
  } catch (error) {
    console.error("Invite staff error:", error);
    return reply(request, { error: "Không thể tạo tài khoản nhân viên. Vui lòng thử lại." }, 500);
  }
});

const REPOSITORY = "huyhumg2019/web-thu-mua-dong-ho";
const WORKFLOW = "kame-price-preview.yml";

const allowedOrigins = [
  "https://huyhumg2019.github.io",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
];

function getCorsHeaders(request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function jsonResponse(
  request,
  body,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function requireEnvironment(name) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Thiếu cấu hình máy chủ ${name}.`);
  }

  return value;
}

async function authorizeStaff(request) {
  const supabaseUrl = requireEnvironment("SUPABASE_URL");
  const serviceRoleKey = requireEnvironment(
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: authorization,
    },
  });

  if (!userResponse.ok) {
    return null;
  }

  const user = await userResponse.json();
  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles` +
      `?id=eq.${encodeURIComponent(user.id)}` +
      "&select=role&limit=1",
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!profileResponse.ok) {
    return null;
  }

  const profiles = await profileResponse.json();
  const role = profiles[0]?.role;

  return ["admin", "staff"].includes(role)
    ? { id: user.id, role }
    : null;
}

async function githubRequest(path, options = {}) {
  const token = requireEnvironment("GITHUB_ACTIONS_TOKEN");
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "REWATCH-admin-sync",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();

    throw new Error(
      `GitHub trả về lỗi ${response.status}: ${detail.slice(0, 200)}`,
    );
  }

  return response;
}

async function getLatestRun() {
  const response = await githubRequest(
    `/repos/${REPOSITORY}/actions/workflows/${WORKFLOW}/runs` +
      "?branch=main&per_page=1",
  );
  const data = await response.json();
  const run = data.workflow_runs?.[0];

  if (!run) {
    return null;
  }

  const eventLabels = {
    schedule: "Tự động hằng ngày",
    workflow_dispatch: "Chạy từ trang quản trị",
    pull_request: "Kiểm tra bản cập nhật",
  };

  return {
    runNumber: run.run_number,
    status: run.status,
    conclusion: run.conclusion,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    eventLabel: eventLabels[run.event] || run.event,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: getCorsHeaders(request),
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed" }, 405);
  }

  try {
    const staff = await authorizeStaff(request);

    if (!staff) {
      return jsonResponse(
        request,
        { error: "Tài khoản không có quyền đồng bộ." },
        403,
      );
    }

    const body = await request.json();

    if (body.action === "status") {
      return jsonResponse(request, { run: await getLatestRun() });
    }

    if (body.action !== "dispatch") {
      return jsonResponse(request, { error: "Yêu cầu không hợp lệ." }, 400);
    }

    const buffer = Number(body.bufferManYen);
    const manualRate = body.jpyToVndRate;
    const hasManualRate =
      manualRate !== null &&
      manualRate !== undefined &&
      manualRate !== "";
    const rate = hasManualRate ? Number(manualRate) : null;

    if (!Number.isFinite(buffer) || buffer < 0) {
      return jsonResponse(
        request,
        { error: "Mức trừ giá Kame không hợp lệ." },
        400,
      );
    }

    if (rate !== null && (!Number.isFinite(rate) || rate <= 0)) {
      return jsonResponse(request, { error: "Tỷ giá không hợp lệ." }, 400);
    }

    await githubRequest(
      `/repos/${REPOSITORY}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            apply_changes: String(Boolean(body.applyChanges)),
            jpy_to_vnd_rate: rate === null ? "" : String(rate),
            buffer_man_yen: String(buffer),
          },
        }),
      },
    );

    return jsonResponse(
      request,
      {
        accepted: true,
        requestedBy: staff.id,
        applyChanges: Boolean(body.applyChanges),
      },
      202,
    );
  } catch (error) {
    console.error(error);

    return jsonResponse(
      request,
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể xử lý yêu cầu.",
      },
      500,
    );
  }
});

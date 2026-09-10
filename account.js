const accountConfig = window.REWATCH_SUPABASE;

const accountSupabase = supabase.createClient(
  accountConfig.url,
  accountConfig.publishableKey,
);

const authPanel = document.getElementById(
  "customer-auth-panel",
);

const customerDashboard = document.getElementById(
  "customer-dashboard",
);

const loginForm = document.getElementById(
  "customer-login-form",
);

const registerForm = document.getElementById(
  "customer-register-form",
);

const loginTabButton = document.getElementById(
  "show-login-button",
);

const registerTabButton = document.getElementById(
  "show-register-button",
);

const authMessage = document.getElementById(
  "customer-auth-message",
);

const dashboardMessage = document.getElementById(
  "customer-dashboard-message",
);

const requestTableBody = document.getElementById(
  "customer-request-table-body",
);

function showLoginForm() {
  loginForm.hidden = false;
  registerForm.hidden = true;

  loginTabButton.classList.add("active");
  registerTabButton.classList.remove("active");

  authMessage.textContent = "";
}

function showRegisterForm() {
  loginForm.hidden = true;
  registerForm.hidden = false;

  loginTabButton.classList.remove("active");
  registerTabButton.classList.add("active");

  authMessage.textContent = "";
}

loginTabButton.addEventListener("click", showLoginForm);
registerTabButton.addEventListener(
  "click",
  showRegisterForm,
);

function getRequestStatusText(status) {
  const statusNames = {
    new: "Mới nhận",
    contacting: "Đang liên hệ",
    inspection: "Chờ kiểm định",
    quoted: "Đã báo giá",
    purchased: "Đã mua",
    cancelled: "Đã hủy",
  };

  return statusNames[status] || status;
}

function formatRequestDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateValue));
}

function renderCustomerRequests(requests) {
  requestTableBody.innerHTML = "";

  if (requests.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 4;
    cell.textContent =
      "Bạn chưa có yêu cầu thu mua nào.";

    row.appendChild(cell);
    requestTableBody.appendChild(row);

    return;
  }

  requests.forEach((request) => {
    const row = document.createElement("tr");

    const codeCell = document.createElement("td");
    const dateCell = document.createElement("td");
    const itemCountCell = document.createElement("td");
    const statusCell = document.createElement("td");
    const statusLabel = document.createElement("span");

    codeCell.textContent = request.request_code;
    dateCell.textContent =
      formatRequestDate(request.created_at);

    itemCountCell.textContent =
      request.purchase_request_items?.length || 0;

    statusLabel.className =
      `customer-status ${request.status}`;

    statusLabel.textContent =
      getRequestStatusText(request.status);

    statusCell.appendChild(statusLabel);

    row.appendChild(codeCell);
    row.appendChild(dateCell);
    row.appendChild(itemCountCell);
    row.appendChild(statusCell);

    requestTableBody.appendChild(row);
  });
}

function updateCustomerSummary(requests) {
  const processingStatuses = [
    "new",
    "contacting",
    "inspection",
    "quoted",
  ];

  const processingTotal = requests.filter((request) =>
    processingStatuses.includes(request.status),
  ).length;

  const completedTotal = requests.filter(
    (request) => request.status === "purchased",
  ).length;

  document.getElementById(
    "request-total",
  ).textContent = requests.length;

  document.getElementById(
    "request-processing",
  ).textContent = processingTotal;

  document.getElementById(
    "request-completed",
  ).textContent = completedTotal;
}

async function loadCustomerRequests(customerId) {
  dashboardMessage.textContent =
    "Đang tải lịch sử giao dịch...";

  const { data, error } = await accountSupabase
    .from("purchase_requests")
    .select(`
      request_code,
      status,
      created_at,
      purchase_request_items (
        id
      )
    `)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);

    dashboardMessage.textContent =
      "Không thể tải lịch sử giao dịch.";

    return;
  }

  const requests = data || [];

  renderCustomerRequests(requests);
  updateCustomerSummary(requests);

  dashboardMessage.textContent =
    requests.length > 0
      ? `Đã tải ${requests.length} yêu cầu.`
      : "";
}

async function showCustomerAccount(session) {
  const { data: profile, error } = await accountSupabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", session.user.id)
    .single();

  if (error || !profile) {
    console.error(error);

    await accountSupabase.auth.signOut();

    authMessage.textContent =
      "Không thể tải thông tin tài khoản.";

    return;
  }

  if (profile.role !== "customer") {
    await accountSupabase.auth.signOut();

    authMessage.textContent =
      "Đây không phải tài khoản khách hàng.";

    return;
  }

  authPanel.hidden = true;
  customerDashboard.hidden = false;

  document.getElementById(
    "customer-account-name",
  ).textContent =
    `${profile.full_name || "Khách hàng"} · ${session.user.email}`;

  await loadCustomerRequests(session.user.id);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document
    .getElementById("customer-login-email")
    .value
    .trim();

  const password = document.getElementById(
    "customer-login-password",
  ).value;

  authMessage.textContent = "Đang đăng nhập...";

  const { data, error } =
    await accountSupabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    console.error(error);

    authMessage.textContent =
      "Email hoặc mật khẩu không đúng.";

    return;
  }

  authMessage.textContent = "";

  await showCustomerAccount(data.session);
});

registerForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const fullName = document
      .getElementById("customer-register-name")
      .value
      .trim();

    const email = document
      .getElementById("customer-register-email")
      .value
      .trim();

    const password = document.getElementById(
      "customer-register-password",
    ).value;

    const confirmPassword = document.getElementById(
      "customer-register-confirm-password",
    ).value;

    if (password !== confirmPassword) {
      authMessage.textContent =
        "Hai mật khẩu chưa giống nhau.";

      return;
    }

    if (password.length < 8) {
      authMessage.textContent =
        "Mật khẩu cần có ít nhất 8 ký tự.";

      return;
    }

    authMessage.textContent =
      "Đang tạo tài khoản...";

    const { data, error } =
      await accountSupabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

    if (error) {
      console.error(error);

      authMessage.textContent =
        "Không thể tạo tài khoản. Email có thể đã được sử dụng.";

      return;
    }

    registerForm.reset();

    if (data.session) {
      authMessage.textContent = "";
      await showCustomerAccount(data.session);
      return;
    }

    authMessage.textContent =
      "Đã tạo tài khoản. Vui lòng kiểm tra email để xác nhận, sau đó đăng nhập.";

    showLoginForm();

    authMessage.textContent =
      "Đã tạo tài khoản. Vui lòng kiểm tra email để xác nhận, sau đó đăng nhập.";
  },
);

document
  .getElementById("customer-logout-button")
  .addEventListener("click", async () => {
    await accountSupabase.auth.signOut();

    customerDashboard.hidden = true;
    authPanel.hidden = false;

    loginForm.reset();
    registerForm.reset();

    showLoginForm();

    authMessage.textContent = "Đã đăng xuất.";
  });

async function startCustomerAccount() {
  if (
    !accountConfig?.url ||
    !accountConfig?.publishableKey
  ) {
    authMessage.textContent =
      "Chưa thiết lập kết nối Supabase.";

    return;
  }

  const {
    data: { session },
  } = await accountSupabase.auth.getSession();

  if (session) {
    await showCustomerAccount(session);
  }
}

startCustomerAccount();
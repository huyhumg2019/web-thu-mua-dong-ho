const accountsSection = document.getElementById("admin-accounts-section");
const accountsBody = document.getElementById("admin-account-table-body");
const accountsMessage = document.getElementById("admin-accounts-message");
const accountsDetail = document.getElementById("admin-account-detail");
const accountsRequestsBody = document.getElementById("admin-account-requests-body");
const accountsRequestsMessage = document.getElementById("admin-account-requests-message");
let adminAccounts = [];
let accountsGeneration = 0;
let detailGeneration = 0;

const accountRoleNames = {
  customer: "Khách hàng",
  staff: "Nhân viên",
  admin: "Admin",
};

const accountRequestStatuses = {
  new: "Mới nhận",
  contacting: "Đang liên hệ",
  inspection: "Chờ kiểm định",
  quoted: "Đã báo giá",
  purchased: "Đã mua",
  cancelled: "Đã hủy",
};

function accountDate(value) {
  return value
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(value))
    : "—";
}

function accountCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value == null ? "" : String(value);
  row.appendChild(cell);
  return cell;
}

function renderAdminAccounts() {
  const search = document.getElementById("admin-account-search").value.trim().toLocaleLowerCase("vi-VN");
  const role = document.getElementById("admin-account-role").value;
  const filtered = adminAccounts.filter((account) =>
    (!role || account.role === role) &&
    (!search || `${account.full_name || ""} ${account.email || ""}`.toLocaleLowerCase("vi-VN").includes(search))
  );

  accountsBody.replaceChildren();
  document.getElementById("admin-account-count").textContent =
    `${filtered.length} / ${adminAccounts.length} tài khoản`;

  for (const account of filtered) {
    const row = document.createElement("tr");
    accountCell(row, account.full_name || "Chưa cập nhật");
    accountCell(row, account.email || "—");
    accountCell(row, accountRoleNames[account.role] || account.role);
    accountCell(row, accountDate(account.created_at));
    accountCell(row, account.role === "customer" ? account.request_count : "—");
    const action = document.createElement("td");
    if (account.role === "customer") {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Xem yêu cầu";
      button.dataset.accountId = account.account_id;
      action.appendChild(button);
    }
    row.appendChild(action);
    accountsBody.appendChild(row);
  }
}

window.loadAdminAccounts = async function loadAdminAccounts() {
  if (currentProfile?.role !== "admin") return;
  const generation = ++accountsGeneration;
  accountsMessage.textContent = "Đang tải tài khoản...";
  const all = [];

  for (let start = 0; ; start += 500) {
    const { data, error } = await supabaseClient
      .rpc("list_admin_accounts")
      .range(start, start + 499);
    if (generation !== accountsGeneration || currentProfile?.role !== "admin") return;
    if (error) {
      console.error(error);
      accountsMessage.textContent = "Chưa tải được tài khoản. Hãy kiểm tra thiết lập Supabase cho mục này.";
      return;
    }
    all.push(...(data || []));
    if (!data || data.length < 500) break;
  }

  adminAccounts = all;
  renderAdminAccounts();
  accountsMessage.textContent = `Đã tải ${all.length} tài khoản.`;
};

window.clearAdminAccounts = function clearAdminAccounts() {
  ++accountsGeneration;
  ++detailGeneration;
  adminAccounts = [];
  accountsBody.replaceChildren();
  accountsRequestsBody.replaceChildren();
  accountsDetail.hidden = true;
  accountsMessage.textContent = "";
  accountsSection.hidden = true;
  document.getElementById("admin-accounts-link").hidden = true;
};

accountsBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-account-id]");
  if (!button || currentProfile?.role !== "admin") return;
  const account = adminAccounts.find((entry) => entry.account_id === button.dataset.accountId);
  if (!account) return;
  const generation = accountsGeneration;
  const detail = ++detailGeneration;

  accountsDetail.hidden = false;
  document.getElementById("admin-account-detail-title").textContent =
    account.full_name || "Khách hàng";
  document.getElementById("admin-account-detail-email").textContent = account.email || "";
  accountsRequestsBody.replaceChildren();
  accountsRequestsMessage.textContent = "Đang tải lịch sử yêu cầu...";

  const { data, error } = await supabaseClient.rpc("get_admin_account_requests", {
    p_customer_id: account.account_id,
  });
  if (generation !== accountsGeneration || detail !== detailGeneration || currentProfile?.role !== "admin") return;
  if (error) {
    console.error(error);
    accountsRequestsMessage.textContent = "Không thể tải lịch sử yêu cầu.";
    return;
  }

  for (const request of data || []) {
    const row = document.createElement("tr");
    accountCell(row, request.request_code);
    accountCell(row, request.request_type === "consignment" ? "Bán hộ" : "Thu mua");
    accountCell(row, accountDate(request.created_at));
    accountCell(row, request.item_count);
    accountCell(row, accountRequestStatuses[request.status] || request.status);
    accountsRequestsBody.appendChild(row);
  }
  accountsRequestsMessage.textContent = data?.length
    ? `${data.length} yêu cầu.`
    : "Khách chưa gửi yêu cầu nào.";
});

document.getElementById("admin-account-search").addEventListener("input", renderAdminAccounts);
document.getElementById("admin-account-role").addEventListener("change", renderAdminAccounts);
document.getElementById("refresh-admin-accounts").addEventListener("click", window.loadAdminAccounts);
document.getElementById("close-admin-account-detail").addEventListener("click", () => {
  ++detailGeneration;
  accountsDetail.hidden = true;
});

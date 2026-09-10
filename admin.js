const config = window.REWATCH_SUPABASE;

const supabaseClient = supabase.createClient(
  config.url,
  config.publishableKey,
);

const loginPanel = document.getElementById("login-panel");
const dashboard = document.getElementById("admin-dashboard");
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const adminMessage = document.getElementById("admin-message");
const adminUser = document.getElementById("admin-user");
const tableBody = document.getElementById("price-table-body");
const searchInput = document.getElementById("price-search");

let priceRows = [];
let currentProfile = null;

async function showDashboard(session) {
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("full_name, role")
    .eq("id", session.user.id)
    .single();

  if (profileError || !profile) {
    await supabaseClient.auth.signOut();

    loginMessage.textContent =
      "Tài khoản chưa được cấp quyền sử dụng.";

    return;
  }

  if (!["admin", "staff"].includes(profile.role)) {
    await supabaseClient.auth.signOut();

    loginMessage.textContent =
      "Tài khoản không có quyền quản trị.";

    return;
  }

  currentProfile = profile;

  loginPanel.hidden = true;
  dashboard.hidden = false;

  adminUser.textContent =
    `${profile.full_name || session.user.email} · ${profile.role}`;

  await loadPrices();
}

async function loadPrices() {
  adminMessage.textContent = "Đang tải dữ liệu giá...";

  const { data, error } = await supabaseClient
    .from("purchase_prices")
    .select("*")
    .order("brand")
    .order("family")
    .order("reference");

  if (error) {
    console.error(error);

    adminMessage.textContent =
      "Không thể tải dữ liệu giá.";

    return;
  }

  priceRows = data;
  renderPrices(priceRows);

  adminMessage.textContent =
    `Đã tải ${priceRows.length} mã Reference.`;
}

function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text || "";
  return cell;
}

function createPriceInput(value, label) {
  const input = document.createElement("input");

  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.value = value;
  input.setAttribute("aria-label", label);

  return input;
}

function renderPrices(rows) {
  tableBody.innerHTML = "";

  rows.forEach((watch) => {
    const row = document.createElement("tr");

    row.appendChild(createCell(watch.reference));
    row.appendChild(createCell(watch.brand));
    row.appendChild(createCell(watch.family));
    row.appendChild(createCell(watch.model));

    const newPriceCell = document.createElement("td");
    const usedPriceCell = document.createElement("td");
    const actionCell = document.createElement("td");

    const newPriceInput = createPriceInput(
      watch.new_price_million_vnd,
      `Giá hàng mới ${watch.reference}`,
    );

    const usedPriceInput = createPriceInput(
      watch.used_price_million_vnd,
      `Giá hàng đã dùng ${watch.reference}`,
    );

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Lưu giá";

    saveButton.addEventListener("click", async () => {
      const newPrice = Number(newPriceInput.value);
      const usedPrice = Number(usedPriceInput.value);

      if (
        !Number.isFinite(newPrice) ||
        !Number.isFinite(usedPrice) ||
        newPrice < 0 ||
        usedPrice < 0
      ) {
        adminMessage.textContent =
          "Giá phải là số lớn hơn hoặc bằng 0.";

        return;
      }

      saveButton.disabled = true;
      saveButton.textContent = "Đang lưu...";

      const { error } = await supabaseClient
        .from("purchase_prices")
        .update({
          new_price_million_vnd: newPrice,
          used_price_million_vnd: usedPrice,
          updated_at: new Date().toISOString(),
        })
        .eq("reference", watch.reference);

      saveButton.disabled = false;
      saveButton.textContent = "Lưu giá";

      if (error) {
        console.error(error);

        adminMessage.textContent =
          `Không thể lưu giá ${watch.reference}.`;

        return;
      }

      watch.new_price_million_vnd = newPrice;
      watch.used_price_million_vnd = usedPrice;

      adminMessage.textContent =
        `Đã cập nhật giá ${watch.reference}.`;
    });

    newPriceCell.appendChild(newPriceInput);
    usedPriceCell.appendChild(usedPriceInput);
    actionCell.appendChild(saveButton);

    row.appendChild(newPriceCell);
    row.appendChild(usedPriceCell);
    row.appendChild(actionCell);

    tableBody.appendChild(row);
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginMessage.textContent = "Đang đăng nhập...";

  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value;

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    console.error(error);

    loginMessage.textContent =
Text =
      "Email hoặc mật khẩu không đúng.";

    return;
  }

  loginMessage.textContent = "";
  await showDashboard(data.session);
});

document
  .getElementById("logout-button")
  .addEventListener("click", async () => {
    await supabaseClient.auth.signOut();

    currentProfile = null;
    dashboard.hidden = true;
    loginPanel.hidden = false;
    loginForm.reset();

    loginMessage.textContent = "Đã đăng xuất.";
  });

document
  .getElementById("reload-prices")
  .addEventListener("click", loadPrices);

searchInput.addEventListener("input", () => {
  const keyword = searchInput.value.trim().toLowerCase();

  const filteredRows = priceRows.filter((watch) => {
    const searchableText = [
      watch.reference,
      watch.brand,
      watch.family,
      watch.model,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(keyword);
  });

  renderPrices(filteredRows);
});

async function startAdmin() {
  if (!config?.url || !config?.publishableKey) {
    loginMessage.textContent =
  "Email hoặc mật khẩu không đúng.";
    return;
  }

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    await showDashboard(session);
  }
}

startAdmin();
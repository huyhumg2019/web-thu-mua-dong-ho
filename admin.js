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
const productAdminMessage = document.getElementById(
  "product-admin-message",
);
const adminUser = document.getElementById("admin-user");

const priceTableBody = document.getElementById("price-table-body");
const priceSearchInput = document.getElementById("price-search");

const productTableBody = document.getElementById(
  "product-table-body",
);
const productForm = document.getElementById("product-admin-form");
const newProductButton = document.getElementById(
  "new-product-button",
);
const cancelProductButton = document.getElementById(
  "cancel-product-button",
);

const editingProductIdInput = document.getElementById(
  "editing-product-id",
);
const productIdInput = document.getElementById(
  "product-id-input",
);
const productBrandInput = document.getElementById(
  "product-brand-input",
);
const productNameInput = document.getElementById(
  "product-name-input",
);
const productReferenceInput = document.getElementById(
  "product-reference-input",
);
const productPriceInput = document.getElementById(
  "product-price-input",
);
const productConditionInput = document.getElementById(
  "product-condition-input",
);
const productYearInput = document.getElementById(
  "product-year-input",
);
const productBoxInput = document.getElementById(
  "product-box-input",
);
const productPapersInput = document.getElementById(
  "product-papers-input",
);
const productStatusInput = document.getElementById(
  "product-status-input",
);
const productDescriptionInput = document.getElementById(
  "product-description-input",
);
const productImagesInput = document.getElementById(
  "product-images-input",
);

let priceRows = [];
let productRows = [];
let currentProfile = null;

async function showDashboard(session) {
  const { data: profile, error: profileError } =
    await supabaseClient
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

  await Promise.all([
    loadPrices(),
    loadProducts(),
  ]);
}

/* ===== QUẢN LÝ GIÁ THU MUA ===== */

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

  priceRows = data || [];
  renderPrices(priceRows);

  adminMessage.textContent =
    `Đã tải ${priceRows.length} mã Reference.`;
}

function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text ?? "";
  return cell;
}

function createPriceInput(value, label) {
  const input = document.createElement("input");

  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.value = value ?? "";
  input.placeholder = "Chưa đặt";
  input.setAttribute("aria-label", label);

  return input;
}

function formatPurchasePrice(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return "Liên hệ";
  }

  return `${number.toLocaleString("vi-VN")} triệu`;
}

function createPricePairCell(newPrice, usedPrice) {
  const cell = document.createElement("td");

  cell.className = "price-pair";
  cell.innerHTML = `
    <span>Hàng mới <b>${formatPurchasePrice(newPrice)}</b></span>
    <span>Đã dùng <b>${formatPurchasePrice(usedPrice)}</b></span>
  `;

  return cell;
}

function renderPrices(rows) {
  priceTableBody.innerHTML = "";

  rows.forEach((watch) => {
    const row = document.createElement("tr");

    row.appendChild(createCell(watch.reference));

    const watchCell = document.createElement("td");
    watchCell.className = "watch-summary";
    watchCell.innerHTML = `
      <b>${watch.brand || ""} ${watch.family || ""}</b>
      <span>${watch.model || ""}</span>
    `;
    row.appendChild(watchCell);

    const modeCell = document.createElement("td");
    const modeSelect = document.createElement("select");

    modeSelect.className = "price-mode-select";
    modeSelect.setAttribute(
      "aria-label",
      `Chế độ giá ${watch.reference}`,
    );
    modeSelect.innerHTML = `
      <option value="auto">Tự động</option>
      <option value="manual">Thủ công</option>
    `;
    modeSelect.value = watch.price_mode || "auto";
    modeCell.appendChild(modeSelect);
    row.appendChild(modeCell);

    row.appendChild(
      createPricePairCell(
        watch.auto_new_price_million_vnd,
        watch.auto_used_price_million_vnd,
      ),
    );

    const manualCell = document.createElement("td");
    manualCell.className = "manual-price-inputs";

    const newPriceInput = createPriceInput(
      watch.manual_new_price_million_vnd,
      `Giá chỉnh tay hàng mới ${watch.reference}`,
    );

    const usedPriceInput = createPriceInput(
      watch.manual_used_price_million_vnd,
      `Giá chỉnh tay hàng đã dùng ${watch.reference}`,
    );

    const newPriceLabel = document.createElement("label");
    newPriceLabel.textContent = "Hàng mới";
    newPriceLabel.appendChild(newPriceInput);

    const usedPriceLabel = document.createElement("label");
    usedPriceLabel.textContent = "Đã dùng";
    usedPriceLabel.appendChild(usedPriceInput);

    manualCell.appendChild(newPriceLabel);
    manualCell.appendChild(usedPriceLabel);
    row.appendChild(manualCell);

    row.appendChild(
      createPricePairCell(
        watch.new_price_million_vnd,
        watch.used_price_million_vnd,
      ),
    );

    const actionCell = document.createElement("td");
    actionCell.className = "price-actions";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Lưu";

    const autoButton = document.createElement("button");
    autoButton.type = "button";
    autoButton.className = "secondary-action";
    autoButton.textContent = "Dùng tự động";

    function updateManualInputs() {
      const isManual = modeSelect.value === "manual";

      newPriceInput.disabled = !isManual;
      usedPriceInput.disabled = !isManual;
      autoButton.hidden = !isManual;
    }

    modeSelect.addEventListener("change", updateManualInputs);
    updateManualInputs();

    saveButton.addEventListener("click", async () => {
      const isManual = modeSelect.value === "manual";
      const newPrice = Number(newPriceInput.value);
      const usedPrice = Number(usedPriceInput.value);

      if (
        isManual &&
        (
          newPriceInput.value === "" ||
          usedPriceInput.value === "" ||
          !Number.isFinite(newPrice) ||
          !Number.isFinite(usedPrice) ||
          newPrice < 0 ||
          usedPrice < 0
        )
      ) {
        adminMessage.textContent =
          "Chế độ thủ công cần nhập đủ hai mức giá, từ 0 trở lên.";

        return;
      }

      saveButton.disabled = true;
      saveButton.textContent = "Đang lưu...";

      const changes = {
        price_mode: modeSelect.value,
      };

      if (isManual) {
        changes.manual_new_price_million_vnd = newPrice;
        changes.manual_used_price_million_vnd = usedPrice;
      }

      const { error } = await supabaseClient
        .from("purchase_prices")
        .update(changes)
        .eq("reference", watch.reference);

      saveButton.disabled = false;
      saveButton.textContent = "Lưu";

      if (error) {
        console.error(error);

        adminMessage.textContent =
          `Không thể lưu giá ${watch.reference}.`;

        return;
      }

      await loadPrices();

      adminMessage.textContent =
        `Đã cập nhật giá ${watch.reference}.`;
    });

    autoButton.addEventListener("click", async () => {
      autoButton.disabled = true;
      autoButton.textContent = "Đang chuyển...";

      const { error } = await supabaseClient
        .from("purchase_prices")
        .update({
          price_mode: "auto",
        })
        .eq("reference", watch.reference);

      if (error) {
        console.error(error);
        autoButton.disabled = false;
        autoButton.textContent = "Dùng tự động";

        adminMessage.textContent =
          `Không thể đổi ${watch.reference} về giá tự động.`;

        return;
      }

      await loadPrices();

      adminMessage.textContent =
        `${watch.reference} đang dùng giá tự động.`;
    });

    actionCell.appendChild(saveButton);
    actionCell.appendChild(autoButton);
    row.appendChild(actionCell);

    priceTableBody.appendChild(row);
  });
}

/* ===== QUẢN LÝ SẢN PHẨM ===== */

async function loadProducts() {
  productAdminMessage.textContent =
    "Đang tải danh sách sản phẩm...";

  const { data, error } = await supabaseClient
    .from("products")
    .select(`
      *,
      product_images (
        id,
        image_url,
        display_order
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);

    productAdminMessage.textContent =
      "Không thể tải danh sách sản phẩm.";

    return;
  }

  productRows = data || [];
  renderProducts(productRows);

  productAdminMessage.textContent =
    `Đã tải ${productRows.length} sản phẩm.`;
}

function getStatusText(status) {
  const statusNames = {
    available: "Đang bán",
    sold: "Đã bán",
    hidden: "Đang ẩn",
  };

  return statusNames[status] || status;
}

function formatSalePrice(price) {
  const number = Number(price);

  if (!Number.isFinite(number)) {
    return "";
  }

  return `${number.toLocaleString("vi-VN")} triệu`;
}

function renderProducts(rows) {
  productTableBody.innerHTML = "";

  if (rows.length === 0) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");

    emptyCell.colSpan = 7;
    emptyCell.textContent = "Chưa có sản phẩm.";
    emptyRow.appendChild(emptyCell);
    productTableBody.appendChild(emptyRow);

    return;
  }

  rows.forEach((product) => {
    const row = document.createElement("tr");

    row.appendChild(createCell(product.id));
    row.appendChild(createCell(product.brand));
    row.appendChild(createCell(product.name));
    row.appendChild(createCell(product.reference));
    row.appendChild(
      createCell(formatSalePrice(product.sale_price_million_vnd)),
    );

    const statusCell = document.createElement("td");
    const statusLabel = document.createElement("span");

    statusLabel.className =
      `product-status ${product.status}`;
    statusLabel.textContent = getStatusText(product.status);

    statusCell.appendChild(statusLabel);

    const actionCell = document.createElement("td");
    const editButton = document.createElement("button");

    editButton.type = "button";
    editButton.textContent = "Sửa";
    editButton.addEventListener("click", () => {
      openProductForm(product);
    });

    actionCell.appendChild(editButton);

    row.appendChild(statusCell);
    row.appendChild(actionCell);

    productTableBody.appendChild(row);
  });
}

function resetProductForm() {
  productForm.reset();
  editingProductIdInput.value = "";
  productIdInput.disabled = false;
  productStatusInput.value = "available";
  productBoxInput.value = "Có";
  productPapersInput.value = "Có";
}

function openProductForm(product = null) {
  resetProductForm();

  if (product) {
    editingProductIdInput.value = product.id;
    productIdInput.value = product.id;
    productIdInput.disabled = true;

    productBrandInput.value = product.brand || "";
    productNameInput.value = product.name || "";
    productReferenceInput.value =
      product.reference || "";
    productPriceInput.value =
      product.sale_price_million_vnd ?? "";
    productConditionInput.value =
      product.condition || "";
    productYearInput.value =
      product.manufacture_year || "";
    productBoxInput.value = product.box || "Có";
    productPapersInput.value =
      product.papers || "Có";
    productStatusInput.value =
      product.status || "available";
    productDescriptionInput.value =
      product.description || "";
  }

  productForm.hidden = false;
  productAdminMessage.textContent = product
    ? `Đang sửa sản phẩm ${product.reference}.`
    : "Nhập thông tin sản phẩm mới.";

  productForm.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function closeProductForm() {
  resetProductForm();
  productForm.hidden = true;
}

function getFileExtension(file) {
  const extension = file.name
    .split(".")
    .pop()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (extension === "jpeg") {
    return "jpg";
  }

  return extension || "jpg";
}

async function uploadProductImages(productId, files) {
  if (!files.length) {
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ];

  const product = productRows.find(
    (item) => item.id === productId,
  );

  const existingImages =
    product?.product_images || [];

  let displayOrder = existingImages.length;

  for (const [index, file] of files.entries()) {
    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        `Ảnh ${file.name} không đúng định dạng.`,
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error(
        `Ảnh ${file.name} lớn hơn 10 MB.`,
      );
    }

    const extension = getFileExtension(file);
    const filePath =
      `${productId}/${Date.now()}-${index}.${extension}`;

    const { error: uploadError } =
      await supabaseClient.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicUrlData } =
      supabaseClient.storage
        .from("product-images")
        .getPublicUrl(filePath);

    const { error: imageError } = await supabaseClient
      .from("product_images")
      .insert({
        product_id: productId,
        image_url: publicUrlData.publicUrl,
        display_order: displayOrder,
      });

    if (imageError) {
      throw imageError;
    }

    displayOrder += 1;
  }
}

newProductButton.addEventListener("click", () => {
  openProductForm();
});

cancelProductButton.addEventListener("click", () => {
  closeProductForm();
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const editingProductId =
    editingProductIdInput.value.trim();

  let productId = editingProductId;

  const salePrice = Number(productPriceInput.value);

  if (!Number.isFinite(salePrice) || salePrice < 0) {
    productAdminMessage.textContent =
      "Giá bán phải là số lớn hơn hoặc bằng 0.";

    return;
  }

  const productData = {
    brand: productBrandInput.value.trim(),
    name: productNameInput.value.trim(),
    reference:
      productReferenceInput.value.trim().toUpperCase(),
    sale_price_million_vnd: salePrice,
    condition: productConditionInput.value.trim(),
    manufacture_year: productYearInput.value.trim(),
    box: productBoxInput.value,
    papers: productPapersInput.value,
    description:
      productDescriptionInput.value.trim(),
    status: productStatusInput.value,
    updated_at: new Date().toISOString(),
  };

  if (
    !productData.brand ||
    !productData.name ||
    !productData.reference
  ) {
    productAdminMessage.textContent =
      "Vui lòng nhập thương hiệu, tên và Reference.";

    return;
  }

  const submitButton = productForm.querySelector(
    'button[type="submit"]',
  );

  submitButton.disabled = true;
  submitButton.textContent = "Đang lưu...";

  try {
    let saveError = null;

    if (editingProductId) {
      const result = await supabaseClient
        .from("products")
        .update(productData)
        .eq("id", editingProductId);

      saveError = result.error;
    } else {
      const result = await supabaseClient
        .from("products")
        .insert(productData)
        .select("id")
        .single();

      saveError = result.error;

      if (!saveError && result.data) {
        productId = result.data.id;
      }
    }
    if (saveError) {
      throw saveError;
    }

    const selectedFiles = Array.from(
      productImagesInput.files || [],
    );

    if (selectedFiles.length > 0) {
      productAdminMessage.textContent =
        `Đang tải ${selectedFiles.length} ảnh...`;

      await uploadProductImages(productId, selectedFiles);
    }

    closeProductForm();
    await loadProducts();

    productAdminMessage.textContent =
      `Đã lưu sản phẩm ${productData.reference}.`;
  } catch (error) {
    console.error(error);

    if (error.code === "23505") {
      productAdminMessage.textContent =
        "Mã quản lý hoặc Reference đã tồn tại.";
    } else {
      productAdminMessage.textContent =
        error.message || "Không thể lưu sản phẩm.";
    }
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Lưu sản phẩm";
  }
});

/* ===== ĐĂNG NHẬP VÀ ĐĂNG XUẤT ===== */

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginMessage.textContent = "Đang đăng nhập...";

  const email = document
    .getElementById("admin-email")
    .value
    .trim();

  const password = document.getElementById(
    "admin-password",
  ).value;

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    console.error(error);

    loginMessage.textContent =
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
    priceRows = [];
    productRows = [];

    closeProductForm();

    dashboard.hidden = true;
    loginPanel.hidden = false;
    loginForm.reset();

    loginMessage.textContent = "Đã đăng xuất.";
  });

document
  .getElementById("reload-prices")
  .addEventListener("click", async () => {
    await Promise.all([
      loadPrices(),
      loadProducts(),
    ]);
  });

priceSearchInput.addEventListener("input", () => {
  const keyword =
    priceSearchInput.value.trim().toLowerCase();

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
      "Chưa thiết lập kết nối Supabase.";

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
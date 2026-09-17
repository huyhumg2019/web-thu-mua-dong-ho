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
const syncDcomAdjustmentInput = document.getElementById(
  "sync-dcom-adjustment",
);
const syncDcomAdjustmentLabel = document.getElementById(
  "sync-dcom-adjustment-label",
);
const syncBufferInput = document.getElementById(
  "sync-buffer-man-yen",
);
const syncBufferLabel = document.getElementById(
  "sync-buffer-label",
);
const syncStatus = document.getElementById("kame-sync-status");
const syncMessage = document.getElementById("kame-sync-message");
const previewSyncButton = document.getElementById(
  "preview-kame-sync",
);
const applySyncButton = document.getElementById("apply-kame-sync");
const refreshSyncStatusButton = document.getElementById(
  "refresh-sync-status",
);
const newManualPurchaseButton = document.getElementById(
  "new-manual-purchase-button",
);
const manualPurchaseForm = document.getElementById(
  "manual-purchase-form",
);
const cancelManualPurchaseButton = document.getElementById(
  "cancel-manual-purchase-button",
);
const manualPurchaseReference = document.getElementById(
  "manual-purchase-reference",
);
const manualPurchaseBrand = document.getElementById(
  "manual-purchase-brand",
);
const manualPurchaseFamily = document.getElementById(
  "manual-purchase-family",
);
const manualPurchaseModel = document.getElementById(
  "manual-purchase-model",
);
const manualPurchaseVariant = document.getElementById(
  "manual-purchase-variant",
);
const manualPurchaseNewPrice = document.getElementById(
  "manual-purchase-new-price",
);
const manualPurchaseUsedPrice = document.getElementById(
  "manual-purchase-used-price",
);
const manualPurchaseImage = document.getElementById(
  "manual-purchase-image",
);

const priceTableBody = document.getElementById("price-table-body");
const priceSearchInput = document.getElementById("price-search");
const priceBrandFilter = document.getElementById(
  "price-brand-filter",
);
const priceFamilyFilter = document.getElementById(
  "price-family-filter",
);
const backupPurchasePricesButton = document.getElementById(
  "backup-purchase-prices",
);

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
    loadLatestSyncStatus(),
  ]);
}

/* ===== ĐỒNG BỘ KAME ===== */

function formatSyncDate(value) {
  if (!value) {
    return "Không rõ thời gian";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function renderSyncStatus(run) {
  syncStatus.className = "kame-sync-status";

  if (!run) {
    syncStatus.textContent = "Chưa có lần đồng bộ nào.";
    return;
  }

  const isRunning = run.status !== "completed";
  const isSuccess = run.conclusion === "success";
  const pendingLabels = {
    queued: "Đang chờ chạy",
    pending: "Đang chờ chạy",
    waiting: "Đang chờ",
    requested: "Đã yêu cầu chạy",
    in_progress: "Đang chạy",
  };
  const completedLabels = {
    success: "Thành công",
    failure: "Thất bại",
    cancelled: "Đã hủy",
    timed_out: "Quá thời gian",
    skipped: "Đã bỏ qua",
    neutral: "Đã hoàn tất",
    action_required: "Cần xử lý trên GitHub",
  };
  const stateText = isRunning
    ? pendingLabels[run.status] || "Đang chờ trạng thái"
    : completedLabels[run.conclusion] || "Chưa xác định kết quả";

  syncStatus.classList.add(
    isRunning ? "running" : isSuccess ? "success" : "failure",
  );
  syncStatus.textContent =
    `Lần #${run.runNumber}: ${stateText} · ` +
    `${formatSyncDate(run.createdAt)} · ${run.eventLabel}`;
}

async function invokeSyncControl(body) {
  const { data, error } = await supabaseClient.functions.invoke(
    "kame-sync-control",
    { body },
  );

  if (error) {
    throw error;
  }

  return data;
}

async function loadLatestSyncStatus() {
  refreshSyncStatusButton.disabled = true;
  syncStatus.className = "kame-sync-status running";
  syncStatus.textContent = "Đang kiểm tra trạng thái...";

  try {
    const result = await invokeSyncControl({ action: "status" });

    if (result.settings) {
      syncDcomAdjustmentInput.value =
        result.settings.dcomRateAdjustment;
      syncBufferInput.value = result.settings.bufferManYen;
      renderDcomAdjustmentLabel();
      renderBufferLabel();
    }

    renderSyncStatus(result.run);
  } catch (error) {
    console.error(error);
    syncStatus.className = "kame-sync-status failure";
    syncStatus.textContent =
      "Chưa kết nối được chức năng đồng bộ an toàn.";
  } finally {
    refreshSyncStatusButton.disabled = false;
  }
}

async function requestKameSync(applyChanges) {
  const adjustmentText = syncDcomAdjustmentInput.value.trim();
  const bufferText = syncBufferInput.value.trim();
  const adjustment = Number(adjustmentText);
  const buffer = Number(bufferText);

  if (
    !Number.isFinite(adjustment) ||
    adjustment < -50 ||
    adjustment > 50
  ) {
    syncMessage.textContent =
      "Mức điều chỉnh DCOM phải từ −50 đến +50.";
    return;
  }

  if (!Number.isFinite(buffer) || buffer < 0) {
    syncMessage.textContent = "Mức trừ giá Kame phải từ 0 trở lên.";
    return;
  }

  if (
    applyChanges &&
    !window.confirm(
      "Đồng bộ giá và ảnh Kame vào website ngay bây giờ?",
    )
  ) {
    return;
  }

  previewSyncButton.disabled = true;
  applySyncButton.disabled = true;
  syncMessage.textContent = applyChanges
    ? "Đang yêu cầu cập nhật dữ liệu..."
    : "Đang yêu cầu tạo bản xem trước...";

  try {
    await invokeSyncControl({
      action: "dispatch",
      applyChanges,
      dcomRateAdjustment: adjustment,
      bufferManYen: buffer,
    });

    syncStatus.className = "kame-sync-status running";
    syncStatus.textContent =
      "Đã gửi yêu cầu. GitHub đang xếp hàng xử lý phía sau.";
    syncMessage.textContent = applyChanges
      ? "Đã bắt đầu đồng bộ thật. Kiểm tra lại sau khoảng 1 phút."
      : "Đã bắt đầu xem trước. Dữ liệu website chưa bị thay đổi.";

    window.setTimeout(loadLatestSyncStatus, 10000);
  } catch (error) {
    console.error(error);
    syncMessage.textContent =
      error.message || "Không thể bắt đầu đồng bộ.";
  } finally {
    previewSyncButton.disabled = false;
    applySyncButton.disabled = false;
  }
}

function renderDcomAdjustmentLabel() {
  const adjustment = Number(syncDcomAdjustmentInput.value);

  if (!Number.isFinite(adjustment)) {
    syncDcomAdjustmentLabel.textContent =
      "Nhập mức cộng hoặc trừ so với tỷ giá DCOM.";
    return;
  }

  const operator = adjustment >= 0 ? "+" : "−";
  syncDcomAdjustmentLabel.textContent =
    `Tỷ giá sử dụng: DCOM ${operator} ` +
    `${Math.abs(adjustment)} VND/JPY.`;
}

function renderBufferLabel() {
  const buffer = Number(syncBufferInput.value);

  if (!Number.isFinite(buffer) || buffer < 0) {
    syncBufferLabel.textContent =
      "Nhập số 万円 cần trừ khỏi giá nguồn (Kame và Watchnian).";
    return;
  }

  syncBufferLabel.textContent =
    `Giá thu mua sử dụng: Giá nguồn − ${buffer}万円 (Kame và Watchnian).`;
}

previewSyncButton.addEventListener("click", () => {
  requestKameSync(false);
});

applySyncButton.addEventListener("click", () => {
  requestKameSync(true);
});

refreshSyncStatusButton.addEventListener("click", () => {
  loadLatestSyncStatus();
});

syncDcomAdjustmentInput.addEventListener(
  "input",
  renderDcomAdjustmentLabel,
);

syncBufferInput.addEventListener("input", renderBufferLabel);

renderDcomAdjustmentLabel();
renderBufferLabel();

async function uploadManualPurchaseImage(reference, file) {
  const allowedTypes = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  const extension = allowedTypes[file.type];

  if (!extension) {
    throw new Error("Ảnh phải là JPG, PNG, WEBP hoặc AVIF.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ảnh không được lớn hơn 5 MB.");
  }

  const path =
    `manual/${reference.toLowerCase()}-${Date.now()}.${extension}`;
  const { error } = await supabaseClient.storage
    .from("purchase-price-images")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabaseClient.storage
    .from("purchase-price-images")
    .getPublicUrl(path);

  return data.publicUrl;
}

function closeManualPurchaseForm() {
  manualPurchaseForm.reset();
  manualPurchaseBrand.value = "Rolex";
  manualPurchaseForm.hidden = true;
}

newManualPurchaseButton.addEventListener("click", () => {
  manualPurchaseForm.hidden = false;
  manualPurchaseForm.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
  manualPurchaseReference.focus();
});

cancelManualPurchaseButton.addEventListener(
  "click",
  closeManualPurchaseForm,
);

manualPurchaseForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const reference = manualPurchaseReference.value
    .trim()
    .toUpperCase();
  const newPrice = Number(manualPurchaseNewPrice.value);
  const usedPrice = Number(manualPurchaseUsedPrice.value);
  const imageFile = manualPurchaseImage.files?.[0];

  if (!/^[0-9A-Z-]+$/.test(reference)) {
    adminMessage.textContent = "Reference không hợp lệ.";
    return;
  }

  if (
    !Number.isFinite(newPrice) ||
    !Number.isFinite(usedPrice) ||
    newPrice < 0 ||
    usedPrice < 0
  ) {
    adminMessage.textContent =
      "Vui lòng nhập đủ hai mức giá từ 0 trở lên.";
    return;
  }

  if (!imageFile) {
    adminMessage.textContent = "Vui lòng chọn ảnh đồng hồ.";
    return;
  }

  const submitButton = manualPurchaseForm.querySelector(
    'button[type="submit"]',
  );
  submitButton.disabled = true;
  submitButton.textContent = "Đang lưu...";
  adminMessage.textContent = `Đang tải ảnh ${reference}...`;

  try {
    const imageUrl = await uploadManualPurchaseImage(
      reference,
      imageFile,
    );
    const { error } = await supabaseClient.rpc(
      "upsert_manual_purchase_price",
      {
        p_reference: reference,
        p_brand: manualPurchaseBrand.value.trim(),
        p_family: manualPurchaseFamily.value.trim(),
        p_model: manualPurchaseModel.value.trim(),
        p_variant_label:
          manualPurchaseVariant.value.trim() || "Tiêu chuẩn",
        p_new_price: newPrice,
        p_used_price: usedPrice,
        p_image_url: imageUrl,
      },
    );

    if (error) {
      throw error;
    }

    closeManualPurchaseForm();
    await loadPrices();
    adminMessage.textContent =
      `Đã lưu mã thu mua thủ công ${reference}.`;
  } catch (error) {
    console.error(error);
    adminMessage.textContent =
      error.message || `Không thể lưu ${reference}.`;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Lưu mã thu mua";
  }
});

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
  updatePriceFilters();
  renderFilteredPrices();

  adminMessage.textContent =
    `Đã tải ${priceRows.length} mã Reference.`;
}

function getPriceBrand(watch) {
  const brand = String(watch.brand || "Khác").trim();
  const normalizedBrand = brand.toLowerCase();

  if (normalizedBrand.includes("rolex")) {
    return "Rolex";
  }

  if (normalizedBrand.includes("patek")) {
    return "Patek Philippe";
  }

  if (
    normalizedBrand === "ap" ||
    normalizedBrand.includes("audemars")
  ) {
    return "Audemars Piguet (AP)";
  }

  return brand || "Khác";
}

function getPriceFamilyGroup(watch) {
  const family = String(watch.family || "Khác").trim();

  if (["Submariner", "Submariner Date"].includes(family)) {
    return "Submariner";
  }

  if (["Sea-Dweller", "Deepsea"].includes(family)) {
    return "Sea-Dweller / Deepsea";
  }

  if (["Explorer", "Explorer II"].includes(family)) {
    return "Explorer";
  }

  return family || "Khác";
}

function updatePriceFamilyFilter() {
  const selectedFamily = priceFamilyFilter.value;
  const selectedBrand = priceBrandFilter.value;
  const families = [...new Set(
    priceRows
      .filter(
        (watch) =>
          !selectedBrand ||
          getPriceBrand(watch) === selectedBrand,
      )
      .map(getPriceFamilyGroup),
  )].sort((first, second) =>
    first.localeCompare(second, "vi"),
  );

  priceFamilyFilter.innerHTML =
    '<option value="">Tất cả dòng đồng hồ</option>';

  families.forEach((family) => {
    const option = document.createElement("option");
    option.value = family;
    option.textContent = family;
    priceFamilyFilter.appendChild(option);
  });

  priceFamilyFilter.value = families.includes(selectedFamily)
    ? selectedFamily
    : "";
}

function updatePriceFilters() {
  const selectedBrand = priceBrandFilter.value;
  const brands = [...new Set(priceRows.map(getPriceBrand))]
    .sort((first, second) =>
      first.localeCompare(second, "vi"),
    );

  priceBrandFilter.innerHTML =
    '<option value="">Tất cả thương hiệu</option>';

  brands.forEach((brand) => {
    const option = document.createElement("option");
    option.value = brand;
    option.textContent = brand;
    priceBrandFilter.appendChild(option);
  });

  if (brands.includes(selectedBrand)) {
    priceBrandFilter.value = selectedBrand;
  }

  updatePriceFamilyFilter();
}

function renderFilteredPrices() {
  const keyword = priceSearchInput.value.trim().toLowerCase();
  const selectedBrand = priceBrandFilter.value;
  const selectedFamily = priceFamilyFilter.value;
  const filteredRows = priceRows.filter((watch) => {
    const searchableText = [
      watch.reference,
      watch.brand,
      watch.family,
      watch.model,
    ]
      .join(" ")
      .toLowerCase();

    return (
      searchableText.includes(keyword) &&
      (!selectedBrand || getPriceBrand(watch) === selectedBrand) &&
      (
        !selectedFamily ||
        getPriceFamilyGroup(watch) === selectedFamily
      )
    );
  });

  renderPrices(filteredRows);
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

  return `${Math.round(number * 1000000).toLocaleString("en-US")}đ`;
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

  const sortedRows = [...rows].sort((first, second) => {
    const brandComparison = getPriceBrand(first)
      .localeCompare(getPriceBrand(second), "vi");

    if (brandComparison !== 0) {
      return brandComparison;
    }

    const familyComparison = getPriceFamilyGroup(first)
      .localeCompare(getPriceFamilyGroup(second), "vi");

    if (familyComparison !== 0) {
      return familyComparison;
    }

    return String(first.reference).localeCompare(
      String(second.reference),
    );
  });
  const familyCounts = sortedRows.reduce((counts, watch) => {
    const groupKey =
      `${getPriceBrand(watch)}||${getPriceFamilyGroup(watch)}`;
    counts.set(groupKey, (counts.get(groupKey) || 0) + 1);
    return counts;
  }, new Map());
  let currentGroup = "";

  sortedRows.forEach((watch) => {
    const brand = getPriceBrand(watch);
    const family = getPriceFamilyGroup(watch);
    const groupKey = `${brand}||${family}`;

    if (groupKey !== currentGroup) {
      currentGroup = groupKey;
      const groupRow = document.createElement("tr");
      const groupCell = document.createElement("td");

      groupRow.className = "family-group-row";
      groupCell.colSpan = 7;
      groupCell.textContent =
        `${brand} · ${family} · ${familyCounts.get(groupKey)} mã`;
      groupRow.appendChild(groupCell);
      priceTableBody.appendChild(groupRow);
    }

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

    if (currentProfile?.role === "admin") {
      const deleteButton = document.createElement("button");

      deleteButton.type = "button";
      deleteButton.className = "danger-action";
      deleteButton.textContent = "Xóa";

      deleteButton.addEventListener("click", async () => {
        const confirmed = window.confirm(
          "Xóa mã " + watch.reference +
            " khỏi danh mục thu mua? " +
            "Thao tác này không thể hoàn tác.",
        );

        if (!confirmed) {
          return;
        }

        deleteButton.disabled = true;
        deleteButton.textContent = "Đang xóa...";

        const { data, error } = await supabaseClient.rpc(
          "delete_purchase_price",
          {
            p_reference: watch.reference,
          },
        );

        if (error || data !== true) {
          console.error(error);
          deleteButton.disabled = false;
          deleteButton.textContent = "Xóa";

          adminMessage.textContent =
            "Không thể xóa " + watch.reference + ".";

          return;
        }

        await loadPrices();

        adminMessage.textContent =
          "Đã xóa " + watch.reference +
          " khỏi danh mục thu mua.";
      });

      actionCell.appendChild(deleteButton);
    }

    row.appendChild(actionCell);

    priceTableBody.appendChild(row);
  });
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '""';
  }

  let text = String(value);

  if (typeof value === "string" && /^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsvFile(rows) {
  const csv = rows
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");
  const blob = new Blob(["\ufeff", csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `rewatch-sao-luu-thu-mua-${date}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function backupPurchasePrices() {
  backupPurchasePricesButton.disabled = true;
  backupPurchasePricesButton.textContent = "Đang sao lưu...";
  adminMessage.textContent =
    "Đang chuẩn bị bản sao lưu giá và ảnh...";

  try {
    const { data: variants, error } = await supabaseClient
      .from("purchase_price_variants")
      .select("*")
      .order("reference")
      .order("display_order");

    if (error) {
      throw error;
    }

    const variantsByReference = new Map();

    (variants || []).forEach((variant) => {
      const list =
        variantsByReference.get(variant.reference) || [];
      list.push(variant);
      variantsByReference.set(variant.reference, list);
    });

    const headings = [
      "Reference",
      "Thương hiệu",
      "Dòng đồng hồ",
      "Tên / phiên bản",
      "Đang hoạt động",
      "Chế độ giá",
      "Giá tự động mới (triệu VND)",
      "Giá tự động đã dùng (triệu VND)",
      "Giá chỉnh tay mới (triệu VND)",
      "Giá chỉnh tay đã dùng (triệu VND)",
      "Giá hiển thị mới (triệu VND)",
      "Giá hiển thị đã dùng (triệu VND)",
      "Nguồn giá",
      "URL nguồn",
      "Mã biến thể",
      "Tên biến thể",
      "Loại dây",
      "Mặt số",
      "Chế độ biến thể",
      "Giá biến thể mới (triệu VND)",
      "Giá biến thể đã dùng (triệu VND)",
      "Giá Kame mới (万円)",
      "Giá Kame đã dùng (万円)",
      "Tỷ giá JPY/VND",
      "Mức trừ Kame (万円)",
      "URL ảnh",
      "Cập nhật lúc",
    ];
    const rows = [headings];

    priceRows.forEach((watch) => {
      const watchVariants =
        variantsByReference.get(watch.reference) || [null];

      watchVariants.forEach((variant) => {
        rows.push([
          watch.reference,
          watch.brand,
          watch.family,
          watch.model,
          watch.active,
          watch.price_mode,
          watch.auto_new_price_million_vnd,
          watch.auto_used_price_million_vnd,
          watch.manual_new_price_million_vnd,
          watch.manual_used_price_million_vnd,
          watch.new_price_million_vnd,
          watch.used_price_million_vnd,
          watch.price_source,
          watch.source_url,
          variant?.variant_key,
          variant?.variant_label,
          variant?.bracelet,
          variant?.dial,
          variant?.price_mode,
          variant?.new_price_million_vnd,
          variant?.used_price_million_vnd,
          variant?.source_new_price_man_yen ??
            watch.source_new_price_man_yen,
          variant?.source_used_price_man_yen ??
            watch.source_used_price_man_yen,
          variant?.fx_jpy_vnd ??
            watch.source_exchange_rate_jpy_vnd,
          variant?.buffer_man_yen,
          variant?.image_url || watch.image_url,
          variant?.updated_at || watch.updated_at,
        ]);
      });
    });

    downloadCsvFile(rows);
    adminMessage.textContent =
      `Đã tải bản sao lưu ${priceRows.length} mã Reference.`;
  } catch (error) {
    console.error(error);
    adminMessage.textContent =
      error.message || "Không thể tạo bản sao lưu.";
  } finally {
    backupPurchasePricesButton.disabled = false;
    backupPurchasePricesButton.textContent = "Sao lưu CSV";
  }
}

backupPurchasePricesButton.addEventListener(
  "click",
  backupPurchasePrices,
);

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

  return `${Math.round(number * 1000000).toLocaleString("en-US")}đ`;
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

priceSearchInput.addEventListener("input", renderFilteredPrices);
priceBrandFilter.addEventListener("change", () => {
  updatePriceFamilyFilter();
  renderFilteredPrices();
});
priceFamilyFilter.addEventListener("change", renderFilteredPrices);

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

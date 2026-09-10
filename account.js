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

    cell.colSpan = 5;
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
    const detailCell = document.createElement("td");
    const detailButton = document.createElement("button");

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
    detailButton.type = "button";
    detailButton.className = "customer-detail-button";
    detailButton.textContent = "Xem chi tiết";

    detailButton.addEventListener("click", () => {
      openCustomerRequestDetail(request);
    });

    detailCell.appendChild(detailButton);

    row.appendChild(codeCell);
    row.appendChild(dateCell);
    row.appendChild(itemCountCell);
    row.appendChild(statusCell);
    row.appendChild(detailCell);

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

const customerRequestDialog = document.getElementById(
  "customer-request-dialog",
);

function getConditionText(condition) {
  const conditionNames = {
    unused: "Chưa sử dụng",
    "very-good": "Đã dùng – tình trạng rất tốt",
    used: "Đã qua sử dụng",
    "needs-check": "Cần REWATCH kiểm tra",
  };

  return conditionNames[condition] || condition || "Chưa cung cấp";
}

function getYesNoText(value) {
  const valueNames = {
    yes: "Có",
    no: "Không",
    unknown: "Không rõ",
  };

  return valueNames[value] || value || "Chưa cung cấp";
}

function appendRequestInformation(
  container,
  label,
  value,
) {
  const row = document.createElement("p");
  const labelElement = document.createElement("span");
  const valueElement = document.createElement("strong");

  labelElement.textContent = label;
  valueElement.textContent =
    value || "Chưa cung cấp";

  row.appendChild(labelElement);
  row.appendChild(valueElement);
  container.appendChild(row);
}

async function openCustomerRequestDetail(request) {
  document.getElementById(
    "detail-request-code",
  ).textContent = request.request_code;

  document.getElementById(
    "detail-request-status",
  ).textContent =
    `${request.request_type === "consignment"
      ? "Yêu cầu bán hộ"
      : "Yêu cầu thu mua"} · ` +
    getRequestStatusText(request.status);

  const itemsContainer = document.getElementById(
    "detail-request-items",
  );

  itemsContainer.innerHTML = "";

  customerRequestDialog.showModal();

  const items =
    request.purchase_request_items || [];

  for (const item of items) {
    const article = document.createElement("article");
    const heading = document.createElement("h3");
    const information = document.createElement("div");
    const imageGallery = document.createElement("div");

   article.className = "customer-request-item";
  information.className =
      "customer-request-item-information";
    imageGallery.className =
      "customer-request-image-gallery";

    heading.textContent =
      item.watch_name || `Đồng hồ ${item.item_number}`;

    appendRequestInformation(
      information,
      "Reference",
      item.reference,
    );

    appendRequestInformation(
      information,
      "Tình trạng",
      getConditionText(item.watch_condition),
    );

    appendRequestInformation(
      information,
      "Năm sản xuất",
      item.manufacture_year,
    );

    appendRequestInformation(
      information,
      "Giá mong muốn",
      item.expected_price_million_vnd
        ? `${new Intl.NumberFormat("vi-VN").format(
            item.expected_price_million_vnd,
          )} triệu VND`
        : "Không cung cấp",
    );

    appendRequestInformation(
      information,
      "Hộp",
      getYesNoText(item.box_status),
    );

    appendRequestInformation(
      information,
      "Giấy tờ",
      getYesNoText(item.papers_status),
    );

    if (item.note) {
      appendRequestInformation(
        information,
        "Ghi chú",
        item.note,
      );
    }

    const images = [
      ...(item.purchase_request_images || []),
    ].sort(
      (first, second) =>
        first.display_order - second.display_order,
    );

    if (images.length === 0) {
      const emptyImageMessage =
        document.createElement("p");

      emptyImageMessage.textContent =
        "Yêu cầu này chưa có ảnh.";

      imageGallery.appendChild(emptyImageMessage);
    } else {
      const { data: signedImages, error } =
        await accountSupabase.storage
          .from("purchase-request-images")
          .createSignedUrls(
            images.map((image) => image.storage_path),
            3600,
          );

      if (error) {
        console.error(error);

        const imageError =
          document.createElement("p");

        imageError.textContent =
          "Không thể tải ảnh đồng hồ.";

        imageGallery.appendChild(imageError);
      } else {
        signedImages.forEach((signedImage, index) => {
          if (!signedImage.signedUrl) {
            return;
          }

          const imageElement =
            document.createElement("img");

          imageElement.src = signedImage.signedUrl;
          imageElement.alt =
            `${item.watch_name || "Đồng hồ"} - ảnh ${index + 1}`;

          imageElement.loading = "lazy";

          imageGallery.appendChild(imageElement);
        });
      }
    }

    article.appendChild(heading);
    article.appendChild(information);
    article.appendChild(imageGallery);

    itemsContainer.appendChild(article);
  }
}

document
  .getElementById("customer-request-close")
  .addEventListener("click", () => {
    customerRequestDialog.close();
  });

customerRequestDialog.addEventListener(
  "click",
  (event) => {
    if (event.target === customerRequestDialog) {
      customerRequestDialog.close();
    }
  },
);

async function loadCustomerRequests(customerId) {
  dashboardMessage.textContent =
    "Đang tải lịch sử giao dịch...";

  const { data, error } = await accountSupabase
    .from("purchase_requests")
    .select(`
      request_code,
      request_type,
      status,
      created_at,
      purchase_request_items (
        id,
        item_number,
        watch_name,
        brand,
        family,
        model,
        reference,
        watch_condition,
        manufacture_year,
        expected_price_million_vnd,
        box_status,
        papers_status,
        note,
        purchase_request_images (
          storage_path,
          display_order
        )
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

  const isPasswordRecovery =
    new URLSearchParams(window.location.search)
      .get("recovery") === "1";

  if (session && isPasswordRecovery) {
    showResetPasswordForm();
    return;
  }

  if (session) {
    await showCustomerAccount(session);
  }
}

const forgotPasswordButton = document.getElementById(
  "forgot-password-button",
);

const resetForm = document.getElementById(
  "customer-reset-form",
);

const authTabs = document.querySelector(".auth-tabs");

function showResetPasswordForm() {
  authPanel.hidden = false;
  customerDashboard.hidden = true;

  loginForm.hidden = true;
  registerForm.hidden = true;
  resetForm.hidden = false;
  authTabs.hidden = true;

  authMessage.textContent =
    "Hãy nhập mật khẩu mới cho tài khoản.";
}

forgotPasswordButton.addEventListener(
  "click",
  async () => {
    const email = document
      .getElementById("customer-login-email")
      .value
      .trim();

    if (!email) {
      authMessage.textContent =
        "Vui lòng nhập email trước khi đặt lại mật khẩu.";

      return;
    }

    forgotPasswordButton.disabled = true;
    authMessage.textContent =
      "Đang gửi email đặt lại mật khẩu...";

      const redirectTo =
      `${window.location.origin}${window.location.pathname}?recovery=1`;

    const { error } =
      await accountSupabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo,
        },
      );

    if (error) {
      console.error(error);

      authMessage.textContent =
        error.message
          .toLowerCase()
          .includes("rate limit")
          ? "Bạn đã gửi quá nhiều lần. Vui lòng chờ khoảng 1 giờ rồi thử lại."
          : "Không thể gửi email đặt lại mật khẩu.";

      forgotPasswordButton.disabled = false;
      return;
    }

    authMessage.textContent =
      "Đã gửi email. Vui lòng kiểm tra hộp thư và mục Spam.";

    window.setTimeout(() => {
      forgotPasswordButton.disabled = false;
    }, 60000);
  },
);

resetForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const password = document.getElementById(
      "customer-reset-password",
    ).value;

    const confirmPassword = document.getElementById(
      "customer-reset-confirm-password",
    ).value;

    if (password.length < 8) {
      authMessage.textContent =
        "Mật khẩu cần có ít nhất 8 ký tự.";

      return;
    }

    if (password !== confirmPassword) {
      authMessage.textContent =
        "Hai mật khẩu mới chưa giống nhau.";

      return;
    }

    authMessage.textContent =
      "Đang lưu mật khẩu mới...";

    const { error } =
      await accountSupabase.auth.updateUser({
        password,
      });

    if (error) {
      console.error(error);

      authMessage.textContent =
        "Không thể lưu mật khẩu mới. Liên kết có thể đã hết hạn.";

      return;
    }

    await accountSupabase.auth.signOut();

    resetForm.reset();
    resetForm.hidden = true;
    authTabs.hidden = false;

    showLoginForm();

    authMessage.textContent =
      "Đã đổi mật khẩu. Bây giờ bạn có thể đăng nhập.";
  },
);

accountSupabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    showResetPasswordForm();
  }
});

startCustomerAccount();

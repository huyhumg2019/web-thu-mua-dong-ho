const productConfig = window.REWATCH_SUPABASE;

const productSupabase = supabase.createClient(
  productConfig.url,
  productConfig.publishableKey,
);

function formatPrice(price) {
  const number = Number(price);

  if (!Number.isFinite(number)) {
    return "Liên hệ";
  }

  return (
    new Intl.NumberFormat("vi-VN").format(number) +
    " triệu VND"
  );
}

function setProductMessage(title, detail) {
  document.getElementById("product-name").textContent =
    title;

  document.getElementById(
    "product-reference",
  ).textContent = detail;
}

function showProduct(product) {
  document.title =
    `${product.brand} ${product.name} — REWATCH`;

  document.getElementById("product-brand").textContent =
    product.brand;

  document.getElementById("product-name").textContent =
    product.name;

  document.getElementById(
    "product-reference",
  ).textContent = `Reference: ${product.reference}`;

  document.getElementById("product-price").textContent =
    formatPrice(product.sale_price_million_vnd);

  document.getElementById(
    "product-condition",
  ).textContent = product.condition || "Liên hệ";

  document.getElementById("detail-brand").textContent =
    product.brand;

  document.getElementById(
    "detail-reference",
  ).textContent = product.reference;

  document.getElementById("detail-year").textContent =
    product.manufacture_year || "Liên hệ";

  document.getElementById(
    "detail-condition",
  ).textContent = product.condition || "Liên hệ";

  document.getElementById("detail-box").textContent =
    product.box || "Liên hệ";

  document.getElementById("detail-papers").textContent =
    product.papers || "Liên hệ";

  document.getElementById(
    "product-description",
  ).textContent = product.description || "";

  renderProductImages(
    product.product_images || [],
    product,
  );
}

function renderProductImages(images, product) {
  const sortedImages = [...images].sort(
    (first, second) =>
      first.display_order - second.display_order,
  );

  const mainImage =
    document.getElementById("product-image");

  const thumbnailArea = document.getElementById(
    "product-thumbnails",
  );

  thumbnailArea.innerHTML = "";
  mainImage.removeAttribute("src");

  if (sortedImages.length === 0) {
    mainImage.alt = "Sản phẩm chưa có ảnh";
    return;
  }

  function selectImage(imageUrl, activeButton) {
    mainImage.src = imageUrl;
    mainImage.alt =
      `${product.brand} ${product.name}`;

    thumbnailArea
      .querySelectorAll(".product-thumbnail")
      .forEach((item) => {
        item.classList.remove("active");
      });

    activeButton.classList.add("active");
  }

  sortedImages.forEach((image, index) => {
    const button = document.createElement("button");
    const thumbnail = document.createElement("img");

    button.type = "button";
    button.className = "product-thumbnail";

    thumbnail.src = image.image_url;
    thumbnail.alt =
      `${product.name} - ảnh ${index + 1}`;
    thumbnail.loading = "lazy";

    button.appendChild(thumbnail);

    button.addEventListener("click", () => {
      selectImage(image.image_url, button);
    });

    thumbnailArea.appendChild(button);

    if (index === 0) {
      selectImage(image.image_url, button);
    }
  });
}

async function loadProduct() {
  if (
    !productConfig?.url ||
    !productConfig?.publishableKey
  ) {
    setProductMessage(
      "Chưa thiết lập kết nối",
      "Vui lòng liên hệ REWATCH.",
    );
    return;
  }

  const requestedReference = decodeURIComponent(
    window.location.hash.slice(1),
  )
    .trim()
    .toUpperCase();

  if (!requestedReference) {
    setProductMessage(
      "Không tìm thấy sản phẩm",
      "Đường dẫn sản phẩm chưa có mã Reference.",
    );
    return;
  }

  const { data: product, error } =
    await productSupabase
      .from("products")
      .select(`
        id,
        brand,
        name,
        reference,
        sale_price_million_vnd,
        condition,
        manufacture_year,
        box,
        papers,
        description,
        status,
        product_images (
          image_url,
          display_order
        )
      `)
      .eq("reference", requestedReference)
      .eq("status", "available")
      .maybeSingle();

  if (error) {
    console.error(error);

    setProductMessage(
      "Không thể tải dữ liệu sản phẩm",
      "Vui lòng thử lại hoặc liên hệ REWATCH.",
    );
    return;
  }

  if (!product) {
    setProductMessage(
      "Không tìm thấy sản phẩm",
      "Sản phẩm có thể đã được bán hoặc ngừng đăng.",
    );
    return;
  }

  showProduct(product);
}

document
  .getElementById("zoom-image")
  .addEventListener("click", () => {
    document
      .querySelector(".product-main-image")
      .classList.toggle("zoomed");
  });

document
  .querySelector(".save-product")
  .addEventListener("click", (event) => {
    const button = event.currentTarget;
    const saved = button.classList.toggle("saved");

    button.textContent = saved
      ? "♥ Đã lưu sản phẩm"
      : "♡ Lưu sản phẩm";
  });

const menuButton = document.querySelector(".menu");

menuButton.addEventListener("click", () => {
  const isOpen =
    document.body.classList.toggle("menu-open");

  menuButton.setAttribute(
    "aria-expanded",
    String(isOpen),
  );
});

document
  .querySelectorAll("header nav a")
  .forEach((link) => {
    link.addEventListener("click", () => {
      document.body.classList.remove("menu-open");

      menuButton.setAttribute(
        "aria-expanded",
        "false",
      );
    });
  });

loadProduct();

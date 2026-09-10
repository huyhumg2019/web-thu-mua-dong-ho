function formatPrice(price) {
  return new Intl.NumberFormat("vi-VN").format(price) + " triệu VND";
}

function parseProducts(csvText) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/);

  return lines.slice(1).map((line) => {
    const columns = line.split(",").map((value) => value.trim());

    return {
      id: columns[0],
      brand: columns[1],
      name: columns[2],
      reference: columns[3],
      price: Number(columns[4]),
      condition: columns[5],
      year: columns[6],
      box: columns[7],
      papers: columns[8],
      images: [columns[9], columns[10], columns[11]].filter(Boolean),
      description: columns[12],
      status: columns[13],
    };
  });
}

function showProduct(product) {
  document.title = `${product.brand} ${product.name} — REWATCH`;

  document.getElementById("product-brand").textContent = product.brand;
  document.getElementById("product-name").textContent = product.name;

  document.getElementById("product-reference").textContent =
    `Reference: ${product.reference}`;

  document.getElementById("product-price").textContent =
    formatPrice(product.price);

  document.getElementById("product-condition").textContent =
    product.condition;

  document.getElementById("detail-brand").textContent = product.brand;
  document.getElementById("detail-reference").textContent =
    product.reference;
  document.getElementById("detail-year").textContent = product.year;

  document.getElementById("detail-condition").textContent =
    product.condition;

  document.getElementById("detail-box").textContent = product.box;
  document.getElementById("detail-papers").textContent = product.papers;

  document.getElementById("product-description").textContent =
    product.description;

  const mainImage = document.getElementById("product-image");
  const thumbnailArea = document.getElementById("product-thumbnails");

  thumbnailArea.innerHTML = "";

  if (product.images.length === 0) {
    mainImage.alt = "Sản phẩm chưa có ảnh";
    return;
  }

  mainImage.src = product.images[0];
  mainImage.alt = `${product.brand} ${product.name}`;

  product.images.forEach((imageUrl, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className =
      index === 0
        ? "product-thumbnail active"
        : "product-thumbnail";

    button.innerHTML = `
      <img
        src="${imageUrl}"
        alt="${product.name} - ảnh ${index + 1}"
      >
    `;

    button.addEventListener("click", () => {
      mainImage.src = imageUrl;

      document
        .querySelectorAll(".product-thumbnail")
        .forEach((item) => item.classList.remove("active"));

      button.classList.add("active");
    });

    thumbnailArea.appendChild(button);
  });
}

async function loadProduct() {
  try {
    const response = await fetch("./data/products.csv");

    if (!response.ok) {
      throw new Error("Không đọc được products.csv");
    }

    const csvText = await response.text();
    const products = parseProducts(csvText);

    const requestedReference =
  decodeURIComponent(window.location.hash.slice(1)) ||
  products[0]?.reference;

    

    const product = products.find(
      (item) =>
        item.reference.toUpperCase() ===
        requestedReference.toUpperCase(),
    );

    if (!product) {
      document.getElementById("product-name").textContent =
        "Không tìm thấy sản phẩm";

      document.getElementById("product-reference").textContent =
        "Sản phẩm có thể đã được bán hoặc ngừng đăng.";

      return;
    }

    if (product.status !== "available") {
      document.getElementById("product-name").textContent =
        "Sản phẩm đã bán";

      document.getElementById("product-reference").textContent =
        `Reference: ${product.reference}`;

      return;
    }

    showProduct(product);
  } catch (error) {
    console.error(error);

    document.getElementById("product-name").textContent =
      "Không thể tải dữ liệu sản phẩm";

    document.getElementById("product-reference").textContent =
      "Vui lòng kiểm tra file data/products.csv.";
  }
}

document.getElementById("zoom-image").addEventListener("click", () => {
  document
    .querySelector(".product-main-image")
    .classList.toggle("zoomed");
});

document.querySelector(".save-product").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const saved = button.classList.toggle("saved");

  button.textContent = saved
    ? "♥ Đã lưu sản phẩm"
    : "♡ Lưu sản phẩm";
});

document.querySelector(".menu").addEventListener("click", () => {
  document.body.classList.toggle("menu-open");
});

loadProduct();
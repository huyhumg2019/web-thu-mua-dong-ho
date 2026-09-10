const supabasePublicClient = supabase.createClient(
  window.REWATCH_SUPABASE.url,
  window.REWATCH_SUPABASE.publishableKey,
);
const images={rolex:'https://image.springnews.co.th/uploads/images/contents/w1024/2022/07/vCpMD13KYV4fssoRzOkc.webp?x-image-process=style%2Flg-webp',patek:'https://manufaktura-watches.ru/upload/resize_cache/iblock/200/739_1000_1/ekjgfrjcqndntebfe3imknvrbjio2xkm.jpg',ap:'https://verdaci.com/cdn/shop/products/apwhite.jpg?v=1678961381',pepsi:'https://firstclasstimepieces.com/cdn/shop/products/rolex-gmt-master-ii-pepsi-40mm-126710blro-black-dial-first-class-timepieces_1080x.jpg?v=1589439358',daytona:'https://greenwichtimecdm.com/cdn/shop/files/CosmographDaytona116520SteelWhiteDial40mm.png?v=1755039601&width=3840',datejust:'https://www.watchesofswitzerland.com/cdn/shop/files/m126334-0001.avif?v=6277866648194590207',submariner:'https://opis-cdn.tinkoffjournal.ru/mercury/03-divers-licence.png',daydate:'https://media.gq-magazine.co.uk/photos/69a1955d0960f39b26d021c0/master/w_1600%2Cc_limit/2702-Suit-Watches-9.jpg',oyster:'https://www.marcolino.pt/content/images/2025/watch_assets/upright_watches_assets/mobile/upright_m124200-0011.webp?v=1776682922',yacht:'https://delugs.com/cdn/shop/files/Rolex_-_Yacht-Master_40_-_126622-0001_-_PRO_690x690_crop_center.jpg?v=1713947717',sea:'https://www.robertgatwardjewellers.co.uk/cdn/shop/files/v7-m126600-0002_watch-assets-upright_landscape.webp?v=1746087673',air:'https://touchofgold.ca/cdn/shop/files/mobile_m126900-0001_drp-upright-bba-with-shadow_800x800_crop_center.webp?v=1738209079',explorer:'https://cdn.prod.website-files.com/64c794410a6c56562470f505/656024300aa08c8d4e44c6f9_124270-0001.png',sky:'https://www.aviandco.com/media/catalog/product/cache/ec2e76e256f4e9d4c0d7c929c318f728/r/o/rolex_sky_dweller_326934_white_index-1_4.jpg'};
const brands=[{name:'Rolex',slug:'rolex',count:'10 dòng',image:images.rolex,copy:'Datejust · GMT-Master II · Submariner'},{name:'Patek Philippe',slug:'patek',count:'4 dòng',image:images.patek,copy:'Nautilus · Aquanaut · Calatrava'},{name:'Audemars Piguet',slug:'ap',count:'3 dòng',image:images.ap,copy:'Royal Oak · Offshore · Code 11.59'}];
// Dữ liệu giá mẫu: chỉ cần sửa n (hàng mới) và u (hàng đã dùng), đơn vị triệu VND.
const buyModels={rolex:[
  {name:'Datejust',ref:'Dòng Datejust',image:images.datejust,n:0,u:0},
  {name:'Submariner',ref:'Dòng Submariner',image:images.submariner,n:0,u:0},
  {name:'GMT-Master II',ref:'Dòng GMT-Master II',image:images.pepsi,n:0,u:0},
  {name:'Day-Date',ref:'Dòng Day-Date',image:images.daydate,n:0,u:0},
  {name:'Oyster Perpetual',ref:'Dòng Oyster Perpetual',image:images.oyster,n:0,u:0},
  {name:'Yacht-Master',ref:'Dòng Yacht-Master',image:images.yacht,n:0,u:0},
  {name:'Sea-Dweller',ref:'Dòng Sea-Dweller',image:images.sea,n:0,u:0},
  {name:'Air-King',ref:'Dòng Air-King',image:images.air,n:0,u:0},
  {name:'Explorer',ref:'Dòng Explorer',image:images.explorer,n:0,u:0},
  {name:'Sky-Dweller',ref:'Dòng Sky-Dweller',image:images.sky,n:0,u:0}
],patek:[{name:'Nautilus',ref:'5711/1A-010',image:images.patek,n:3500,u:3200},{name:'Aquanaut',ref:'5167A-001',image:images.patek,n:1200,u:1080}],ap:[{name:'Royal Oak',ref:'15510ST',image:images.ap,n:1200,u:1100},{name:'Royal Oak Offshore',ref:'26420SO',image:images.ap,n:780,u:690}]};
let csvPrices = [];
let csvPricesLoaded = false;

supabasePublicClient
  .from("purchase_prices")
  .select(
    "reference, brand, family, model, new_price_million_vnd, used_price_million_vnd, updated_at",
  )
  .eq("active", true)
  .then(({ data, error }) => {
    if (error) {
      throw error;
    }

    csvPrices = data.map((watch) => {
      let image = images.rolex;

      if (watch.reference.startsWith("126710")) {
        image = images.pepsi;
      } else if (watch.reference.startsWith("126500")) {
        image = images.daytona;
      } else if (watch.reference.startsWith("126610")) {
        image = images.submariner;
      }

         return {
        name: `${watch.brand} ${watch.family} ${watch.model}`,
        brand: watch.brand,
        family: watch.family,
        model: watch.model,
        ref: watch.reference,
        image,
        n: Number(watch.new_price_million_vnd),
        u: Number(watch.used_price_million_vnd),
        updatedAt: watch.updated_at,
      };
    });

    csvPricesLoaded = true;
  })
  .catch((error) => {
    console.error(error);
  });
let saleItems = [];
const vnd=n=>n?new Intl.NumberFormat('vi-VN').format(n)+' triệu VND':'Liên hệ';
const brandTrack=document.getElementById('brand-track');
brands.forEach(b=>{const el=document.createElement('button');el.className='watch-card brand-card';el.innerHTML=`<span class="card-label">THU MUA</span><img src="${b.image}" alt="${b.name}" loading="lazy"><h3>${b.name}</h3><p>${b.copy}</p><small>Xem chi tiết →</small>`;el.onclick=()=>showBrand(b);brandTrack.appendChild(el)});
const saleTrack = document.getElementById("sale-track");

saleTrack.innerHTML = `
  <p class="loading-products">Đang tải sản phẩm...</p>
`;
supabasePublicClient
  .from("products")
  .select(`
    id,
    brand,
    name,
    reference,
    sale_price_million_vnd,
    condition,
    status,
    created_at,
    product_images (
      image_url,
      display_order
    )
  `)
  .eq("status", "available")
  .order("created_at", { ascending: false })
  .then(({ data, error }) => {
    if (error) {
      throw error;
    }

    saleItems = data.map((product) => {
      const sortedImages = [...product.product_images].sort(
        (first, second) =>
          first.display_order - second.display_order,
      );

      return {
        id: product.id,
        brand: product.brand,
        name: product.name,
        ref: product.reference,
        price: Number(product.sale_price_million_vnd),
        condition: product.condition,
        image: sortedImages[0]?.image_url || "",
        status: product.status,
      };
    });

    saleTrack.innerHTML = "";

    saleItems.forEach((product) => {
      const card = document.createElement("button");

      card.className = "watch-card sale-card";

      card.innerHTML = `
        <span class="stock-tag">HÀNG CÓ SẴN</span>

        <img
          src="${product.image}"
          alt="${product.brand} ${product.name}"
          loading="lazy"
        >

        <h3>${product.brand} ${product.name}</h3>

        <p>
          Reference: ${product.ref} · ${product.condition}
        </p>

        <strong>${vnd(product.price)}</strong>
      `;

      card.addEventListener("click", () => {
        window.location.href =
          `product.html#${encodeURIComponent(product.ref)}`;
      });

      saleTrack.appendChild(card);
    });
  })
  .catch((error) => {
    console.error(error);

    saleTrack.innerHTML = `
      <p class="loading-products">
        Không thể tải danh sách sản phẩm.
      </p>
    `;
  });
let selectedBuyBrand = null;
let showingBuyReferences = false;

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function showBrand(brand) {
  selectedBuyBrand = brand;
  showingBuyReferences = false;

  document.getElementById("buy").hidden = true;

  const area = document.getElementById("brand-models");
  const track = document.getElementById("model-track");

  area.hidden = false;

  document.getElementById("brand-name").textContent =
    brand.name;

  track.innerHTML = "";

  buyModels[brand.slug].forEach((family) => {
    const card = document.createElement("button");

    card.className = "watch-card family-card";

    card.innerHTML = `
      <img
        src="${family.image}"
        alt="${family.name}"
        loading="lazy"
      >

      <h3>${family.name}</h3>

      <p>Xem các mẫu và giá thu mua →</p>
    `;

    card.addEventListener("click", () => {
      showFamilyReferences(brand, family);
    });

    track.appendChild(card);
  });

  area.scrollIntoView({
    behavior: "smooth",
  });
}

function showFamilyReferences(brand, family) {
  showingBuyReferences = true;

  const track = document.getElementById("model-track");

  document.getElementById("brand-name").textContent =
    `${brand.name} ${family.name}`;

  track.innerHTML = "";

  if (!csvPricesLoaded) {
    const loadingMessage = document.createElement("p");

    loadingMessage.className = "loading-products";
    loadingMessage.textContent =
      "Dữ liệu giá đang tải. Vui lòng thử lại.";

    track.appendChild(loadingMessage);
    return;
  }

  const matchingWatches = csvPrices.filter((watch) => {
    return (
      normalizeText(watch.brand) ===
        normalizeText(brand.name) &&
      normalizeText(watch.family) ===
        normalizeText(family.name)
    );
  });

  if (matchingWatches.length === 0) {
    const emptyMessage = document.createElement("p");

    emptyMessage.className = "loading-products";
    emptyMessage.textContent =
      "Dòng này đang được cập nhật giá. Vui lòng liên hệ REWATCH.";

    track.appendChild(emptyMessage);
    return;
  }

  matchingWatches.forEach((watch) => {
    const card = document.createElement("button");

    card.className = "watch-card reference-card";

    card.innerHTML = `
      <img
        src="${watch.image}"
        alt="${watch.name}"
        loading="lazy"
      >

      <h3>${watch.model || watch.family}</h3>

      <p>Reference: ${watch.ref}</p>

      <div class="two-prices">
        <span>
          Hàng mới
          <b>${watch.n ? `~${vnd(watch.n)}` : "Liên hệ"}</b>
        </span>

        <span>
          Hàng đã dùng
          <b>${watch.u ? `~${vnd(watch.u)}` : "Liên hệ"}</b>
        </span>
      </div>
    `;

    card.addEventListener("click", () => {
      openDialog(watch, "buy");
    });

    track.appendChild(card);
  });
}

document
  .getElementById("brand-back")
  .addEventListener("click", () => {
    if (showingBuyReferences && selectedBuyBrand) {
      showBrand(selectedBuyBrand);
      return;
    }

    document.getElementById("brand-models").hidden = true;
    document.getElementById("buy").hidden = false;

    document.getElementById("buy").scrollIntoView({
      behavior: "smooth",
    });
  });
function updateCarouselDots(track) {
  const section = track.closest("section");
  const dots = section?.querySelectorAll(".dots i");

  if (!dots || dots.length === 0) {
    return;
  }

  const maximumScroll =
    track.scrollWidth - track.clientWidth;

  const scrollProgress =
    maximumScroll > 0
      ? track.scrollLeft / maximumScroll
      : 0;

  const activeIndex = Math.round(
    scrollProgress * (dots.length - 1),
  );

  dots.forEach((dot, index) => {
    dot.classList.toggle(
      "active",
      index === activeIndex,
    );
  });
}

document.querySelectorAll(".track").forEach((track) => {
  let animationFrame;

  track.addEventListener("scroll", () => {
    cancelAnimationFrame(animationFrame);

    animationFrame = requestAnimationFrame(() => {
      updateCarouselDots(track);
    });
  });

  const section = track.closest("section");
  const dots = section?.querySelectorAll(".dots i");

  dots?.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      const maximumScroll =
        track.scrollWidth - track.clientWidth;

      track.scrollTo({
        left:
          maximumScroll *
          (index / Math.max(dots.length - 1, 1)),
        behavior: "smooth",
      });
    });
  });

  updateCarouselDots(track);
});

document.querySelectorAll(".arrow").forEach((button) => {
  button.addEventListener("click", () => {
    const track = document.getElementById(
      button.dataset.target,
    );

    const direction =
      button.classList.contains("next") ? 1 : -1;

    track.scrollBy({
      left:
        direction *
        Math.min(track.clientWidth * 0.82, 420),
      behavior: "smooth",
    });
  });
});
function openDialog(product, mode) {
  const dialog = document.getElementById("price-dialog");

  document.getElementById("dialog-image").src =
    product.image;

  document.getElementById("dialog-image").alt =
    product.name;

  document.getElementById("dialog-name").textContent =
    product.name;

  document.getElementById("dialog-ref").textContent =
    `Reference: ${product.ref}`;

  document.getElementById("dialog-label").textContent =
    mode === "buy"
      ? "GIÁ THU MUA DỰ KIẾN"
      : product.type;

  document.getElementById("dialog-prices").innerHTML =
    mode === "buy"
      ? `
        <div class="price-line">
          <span>Hàng mới</span>
          <b>${product.n ? `~${vnd(product.n)}` : "Liên hệ"}</b>
        </div>

        <div class="price-line">
          <span>Hàng đã dùng</span>
          <b>${product.u ? `~${vnd(product.u)}` : "Liên hệ"}</b>
        </div>
      `
      : `
        <div class="price-line">
          <span>Giá bán</span>
          <b>${vnd(product.price)}</b>
        </div>

        <div class="price-line">
          <span>Tình trạng</span>
          <b>${product.condition}</b>
        </div>
      `;

  document.getElementById("dialog-note").textContent =
    mode === "buy"
      ? "Giá cuối cùng phụ thuộc tình trạng, năm sản xuất, hộp, giấy tờ và phụ kiện."
      : "Liên hệ để kiểm tra tình trạng còn hàng và đặt lịch xem.";
  if (mode === "buy") {
    const requestButton = document.getElementById(
      "sell-request-button",
    );

    requestButton.dataset.watchName = product.name;
    requestButton.dataset.watchReference = product.ref;
  }
  if (!dialog.open) {
    history.pushState(
      { rewatchPriceDialog: true },
      "",
      window.location.href,
    );

    dialog.showModal();
  }
}

function closePriceDialog() {
  const dialog = document.getElementById("price-dialog");

  if (history.state?.rewatchPriceDialog) {
    history.back();
  } else if (dialog.open) {
    dialog.close();
  }
}

document
  .querySelector(".close")
  .addEventListener("click", closePriceDialog);

document
  .getElementById("price-dialog")
  .addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closePriceDialog();
    }
  });

window.addEventListener("popstate", () => {
  const dialog = document.getElementById("price-dialog");

  if (dialog.open) {
    dialog.close();
  }
});
document.getElementById("search-form").onsubmit = (event) => {
  event.preventDefault();

  const code = document
    .getElementById("reference")
    .value.trim()
    .toUpperCase();

  const message = document.getElementById("search-message");

  if (!csvPricesLoaded) {
    message.textContent = "Dữ liệu giá đang tải. Vui lòng thử lại.";
    return;
  }

  const found = csvPrices.find(
    (watch) => watch.ref.toUpperCase() === code,
  );

  if (found) {
    openDialog(found, "buy");
    message.textContent = "";
  } else {
    message.textContent =
      "Chưa có mã này. Anh có thể gửi ảnh để REWATCH báo giá.";
  }
};
const menuButton = document.querySelector(".menu");
const mainNavigation = document.querySelector("header nav");

function closeMobileMenu() {
  document.body.classList.remove("menu-open");
  menuButton.setAttribute("aria-expanded", "false");
}

menuButton.addEventListener("click", (event) => {
  event.stopPropagation();

  const isOpen =
    document.body.classList.toggle("menu-open");

  menuButton.setAttribute(
    "aria-expanded",
    String(isOpen),
  );
});

mainNavigation
  .querySelectorAll("a")
  .forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

document.addEventListener("click", (event) => {
  if (
    document.body.classList.contains("menu-open") &&
    !mainNavigation.contains(event.target) &&
    !menuButton.contains(event.target)
  ) {
    closeMobileMenu();
  }
});
/* ===== BIỂU MẪU KHÁCH MUỐN BÁN ĐỒNG HỒ ===== */

const sellRequestDialog = document.getElementById(
  "sell-request-dialog",
);

const sellRequestForm = document.getElementById(
  "sell-request-form",
);

function openSellRequestDialog({
  type,
  watchName = "",
  watchReference = "",
}) {
  const priceDialog =
    document.getElementById("price-dialog");

  const consignFields = document.getElementById(
    "consign-watch-fields",
  );

  const consignBrand = document.getElementById(
    "consign-watch-brand",
  );

  const consignModel = document.getElementById(
    "consign-watch-model",
  );

  sellRequestForm.reset();

  document.getElementById("request-type").value = type;

  const isConsignment = type === "consignment";

  document.getElementById(
    "request-dialog-kicker",
  ).textContent = isConsignment
    ? "YÊU CẦU BÁN HỘ"
    : "YÊU CẦU THU MUA";

  document.getElementById(
    "request-dialog-title",
  ).textContent = isConsignment
    ? "Đăng đồng hồ cần bán"
    : "Thông tin đồng hồ";

  document.getElementById(
    "request-submit-button",
  ).textContent = isConsignment
    ? "Gửi yêu cầu bán hộ"
    : "Gửi yêu cầu thu mua";

  consignFields.hidden = !isConsignment;
  consignBrand.required = isConsignment;
  consignModel.required = isConsignment;

  document.getElementById(
    "request-watch-name",
  ).textContent = isConsignment ? "" : watchName;

  document.getElementById(
    "request-watch-reference",
  ).textContent =
    !isConsignment && watchReference
      ? `Reference: ${watchReference}`
      : "";

  document.getElementById(
    "request-message",
  ).textContent = "";

  if (priceDialog.open) {
    priceDialog.close();
  }

  history.pushState(
    { rewatchSellRequest: true },
    "",
    window.location.href,
  );

  sellRequestDialog.showModal();
}

document
  .getElementById("sell-request-button")
  .addEventListener("click", (event) => {
    const button = event.currentTarget;

    openSellRequestDialog({
      type: "purchase",
      watchName: button.dataset.watchName || "",
      watchReference:
        button.dataset.watchReference || "",
    });
  });

document
  .getElementById("consign-request-button")
  .addEventListener("click", (event) => {
    event.preventDefault();

    openSellRequestDialog({
      type: "consignment",
    });
  });

function closeSellRequestDialog() {
  if (history.state?.rewatchSellRequest) {
    history.back();
  } else if (sellRequestDialog.open) {
    sellRequestDialog.close();
  }
}

document
  .querySelector(".sell-request-close")
  .addEventListener("click", closeSellRequestDialog);

sellRequestDialog.addEventListener("click", (event) => {
  if (event.target === event.currentTarget) {
    closeSellRequestDialog();
  }
});

sellRequestDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeSellRequestDialog();
});

document
  .getElementById("price-dialog")
  .addEventListener("cancel", (event) => {
    event.preventDefault();
    closePriceDialog();
  });

window.addEventListener("popstate", () => {
  if (sellRequestDialog.open) {
    sellRequestDialog.close();
  }
});

sellRequestForm.addEventListener("submit", (event) => {
  event.preventDefault();

  document.getElementById(
    "request-message",
  ).textContent =
    "Biểu mẫu đã sẵn sàng. Bước tiếp theo sẽ kết nối gửi dữ liệu.";
});sellRequestForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const message = document.getElementById(
      "request-message",
    );

    const submitButton = document.getElementById(
      "request-submit-button",
    );

    const {
      data: { session },
    } = await supabasePublicClient.auth.getSession();

    if (!session) {
      message.innerHTML =
        'Bạn cần <a href="account.html">đăng nhập tài khoản khách hàng</a> trước khi gửi form.';

      return;
    }

    const requestType = document.getElementById(
      "request-type",
    ).value;

    const isConsignment =
      requestType === "consignment";

    const brand = isConsignment
      ? document
          .getElementById("consign-watch-brand")
          .value.trim()
      : "";

    const model = isConsignment
      ? document
          .getElementById("consign-watch-model")
          .value.trim()
      : document
          .getElementById("request-watch-name")
          .textContent.trim();

    const reference = isConsignment
      ? document
          .getElementById("consign-watch-reference")
          .value.trim()
      : document
          .getElementById("request-watch-reference")
          .textContent.replace("Reference:", "")
          .trim();

    const watchName = isConsignment
      ? `${brand} ${model}`.trim()
      : model;

    const item = {
      watch_name: watchName,
      brand,
      family: "",
      model,
      reference,
      watch_condition: document.getElementById(
        "request-condition",
      ).value,
      manufacture_year: document.getElementById(
        "request-year",
      ).value.trim(),
      expected_price_million_vnd:
        document.getElementById("request-price").value,
      box_status:
        document.getElementById("request-box").value,
      papers_status:
        document.getElementById("request-papers").value,
      note: document
        .getElementById("request-note")
        .value.trim(),
    };
        const selectedFiles = Array.from(
      document.getElementById("request-images").files,
    );

    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (selectedFiles.length > 5) {
      message.textContent =
        "Mỗi đồng hồ chỉ được gửi tối đa 5 ảnh.";

      return;
    }

    for (const file of selectedFiles) {
      if (!allowedImageTypes.includes(file.type)) {
        message.textContent =
          "Ảnh phải có định dạng JPG, PNG, WebP hoặc AVIF.";

        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        message.textContent =
          `Ảnh "${file.name}" vượt quá 10 MB.`;

        return;
      }
    }

    submitButton.disabled = true;
    message.textContent = "Đang gửi yêu cầu...";

    const { data, error } =
      await supabasePublicClient.rpc(
        "create_customer_watch_request",
        {
          p_request_type: requestType,
          p_customer_name: document
            .getElementById("customer-name")
            .value.trim(),
          p_contact_method: document.getElementById(
            "customer-contact-method",
          ).value,
          p_contact_value: document
            .getElementById("customer-contact")
            .value.trim(),
          p_customer_note: "",
          p_items: [item],
        },
      );

       if (error) {
      submitButton.disabled = false;
      console.error(error);

      message.textContent =
        error.message ||
        "Không thể gửi yêu cầu. Vui lòng thử lại.";

      return;
    }

    const requestId = data?.[0]?.request_id;
    const requestCode =
      data?.[0]?.request_code || "";

    if (selectedFiles.length > 0) {
      message.textContent =
        `Đang tải ${selectedFiles.length} ảnh...`;

      const {
        data: requestItem,
        error: itemError,
      } = await supabasePublicClient
        .from("purchase_request_items")
        .select("id")
        .eq("request_id", requestId)
        .order("item_number", { ascending: true })
        .limit(1)
        .single();

      if (itemError || !requestItem) {
        submitButton.disabled = false;
        console.error(itemError);

        message.textContent =
          `Đã lưu ${requestCode}, nhưng chưa thể tải ảnh.`;

        return;
      }

      const uploadedPaths = [];
      const imageRows = [];

      for (
        let index = 0;
        index < selectedFiles.length;
        index += 1
      ) {
        const file = selectedFiles[index];

        const extension =
          file.name
            .split(".")
            .pop()
            ?.toLowerCase()
            .replace(/[^a-z0-9]/g, "") || "jpg";

        const storagePath =
          `${session.user.id}/${requestId}/` +
          `${requestItem.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } =
          await supabasePublicClient.storage
            .from("purchase-request-images")
            .upload(storagePath, file, {
              contentType: file.type,
              upsert: false,
            });

        if (uploadError) {
          console.error(uploadError);

          if (uploadedPaths.length > 0) {
            await supabasePublicClient.storage
              .from("purchase-request-images")
              .remove(uploadedPaths);
          }

          submitButton.disabled = false;

          message.textContent =
            `Đã lưu ${requestCode}, nhưng tải ảnh thất bại.`;

          return;
        }

        uploadedPaths.push(storagePath);

        imageRows.push({
          request_item_id: requestItem.id,
          storage_path: storagePath,
          display_order: index,
        });
      }

      const { error: imageDataError } =
        await supabasePublicClient
          .from("purchase_request_images")
          .insert(imageRows);

      if (imageDataError) {
        console.error(imageDataError);

        await supabasePublicClient.storage
          .from("purchase-request-images")
          .remove(uploadedPaths);

        submitButton.disabled = false;

        message.textContent =
          `Đã lưu ${requestCode}, nhưng chưa thể lưu thông tin ảnh.`;

        return;
      }
    }

    submitButton.disabled = false;
    sellRequestForm.reset();

    message.textContent = requestCode
      ? `Đã gửi thành công. Mã yêu cầu: ${requestCode}. ` +
        `Đã tải ${selectedFiles.length} ảnh.`
      : "Đã gửi yêu cầu thành công.";
  },
);
async function updateAccountNavigation() {
  const accountLink = document.getElementById(
    "account-nav-link",
  );

  if (!accountLink) {
    return;
  }

  const {
    data: { session },
  } = await supabasePublicClient.auth.getSession();

  if (session) {
    accountLink.textContent = "Tài khoản của tôi";
    accountLink.classList.add("logged-in");
    accountLink.title =
      `Đang đăng nhập: ${session.user.email}`;
  } else {
    accountLink.textContent = "Đăng nhập";
    accountLink.classList.remove("logged-in");
    accountLink.title = "Đăng nhập tài khoản khách hàng";
  }
}

updateAccountNavigation();
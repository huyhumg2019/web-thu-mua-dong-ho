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
brands.forEach(b=>{const el=document.createElement('button');el.className='watch-card brand-card';el.innerHTML=`<span class="card-label">THU MUA</span><img src="${b.image}" alt="${b.name}" loading="lazy"><h3>${b.name}</h3><p>${b.copy}</p><small>${b.count} →</small>`;el.onclick=()=>showBrand(b);brandTrack.appendChild(el)});
const saleTrack = document.getElementById("sale-track");

saleTrack.innerHTML = `
  <p class="loading-products">Đang tải sản phẩm...</p>
`;

fetch("./data/products.csv")
  .then((response) => {
    if (!response.ok) {
      throw new Error("Không đọc được products.csv");
    }

    return response.text();
  })
  .then((csvText) => {
    const lines = csvText
      .replace(/^\uFEFF/, "")
      .trim()
      .split(/\r?\n/);

    saleItems = lines
      .slice(1)
      .map((line) => {
        const columns = line
          .split(",")
          .map((value) => value.trim());

        return {
          id: columns[0],
          brand: columns[1],
          name: columns[2],
          ref: columns[3],
          price: Number(columns[4]),
          condition: columns[5],
          image: columns[9],
          status: columns[13],
        };
      })
      .filter((product) => product.status === "available");

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
function showBrand(b){document.getElementById('buy').hidden=true;const area=document.getElementById('brand-models');area.hidden=false;document.getElementById('brand-name').textContent=b.name;const track=document.getElementById('model-track');track.innerHTML='';buyModels[b.slug].forEach(p=>{const el=document.createElement('button');el.className='watch-card';el.innerHTML=`<img src="${p.image}" alt="${p.name}"><h3>${p.name}</h3><p>Reference: ${p.ref}</p><div class="two-prices"><span>Hàng mới <b>${p.n?'~'+vnd(p.n):'Liên hệ'}</b></span><span>Hàng đã dùng <b>${p.u?'~'+vnd(p.u):'Liên hệ'}</b></span></div>`;el.onclick=()=>openDialog(p,'buy');track.appendChild(el)});area.scrollIntoView({behavior:'smooth'})}
document.getElementById('brand-back').onclick=()=>{document.getElementById('brand-models').hidden=true;document.getElementById('buy').hidden=false;document.getElementById('buy').scrollIntoView({behavior:'smooth'})};
document.querySelectorAll('.arrow').forEach(btn=>btn.onclick=()=>{const t=document.getElementById(btn.dataset.target);t.scrollBy({left:(btn.classList.contains('next')?1:-1)*Math.min(t.clientWidth*.82,420),behavior:'smooth'})});
function openDialog(p,mode){document.getElementById('dialog-image').src=p.image;document.getElementById('dialog-image').alt=p.name;document.getElementById('dialog-name').textContent=p.name;document.getElementById('dialog-ref').textContent='Reference: '+p.ref;document.getElementById('dialog-label').textContent=mode==='buy'?'GIÁ THU MUA DỰ KIẾN':p.type;document.getElementById('dialog-prices').innerHTML=mode==='buy'?`<div class="price-line"><span>Hàng mới</span><b>${p.n?'~'+vnd(p.n):'Liên hệ'}</b></div><div class="price-line"><span>Hàng đã dùng</span><b>${p.u?'~'+vnd(p.u):'Liên hệ'}</b></div>`:`<div class="price-line"><span>Giá bán</span><b>${vnd(p.price)}</b></div><div class="price-line"><span>Tình trạng</span><b>${p.condition}</b></div>`;document.getElementById('dialog-note').textContent=mode==='buy'?'Giá cuối cùng phụ thuộc tình trạng, năm sản xuất, hộp, giấy tờ và phụ kiện.':'Liên hệ để kiểm tra tình trạng còn hàng và đặt lịch xem.';document.getElementById('price-dialog').showModal()}
document.querySelector('.close').onclick=()=>document.getElementById('price-dialog').close();
document.getElementById('price-dialog').onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.close()};
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
document.querySelector('.menu').onclick=()=>document.body.classList.toggle('menu-open');

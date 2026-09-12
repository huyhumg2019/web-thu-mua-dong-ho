import { writeFile } from "node:fs/promises";

const KAME_URL =
  "https://www.kame-kichi.com/buy/examples";
const SENDMONEY_RATE_URL =
  "https://sendmoney.co.jp/vi/fx-rate";
const SENDMONEY_RATE_ADJUSTMENT_VND = -2;

const SPECIAL_TARGETS = [
  { reference: "126710BLNR", variantKey: "jubilee-black", variantLabel: "Dây Jubilee", bracelet: "Jubilee", nickname: "Batgirl", occurrence: 0 },
  { reference: "126710BLNR", variantKey: "oyster-black", variantLabel: "Dây Oyster", bracelet: "Oyster", nickname: "Batman", occurrence: 1 },
  { reference: "126710GRNR", variantKey: "jubilee-black", variantLabel: "Dây Jubilee", bracelet: "Jubilee", nickname: "Bruce Wayne", occurrence: 0 },
  { reference: "126710GRNR", variantKey: "oyster-black", variantLabel: "Dây Oyster", bracelet: "Oyster", nickname: "Bruce Wayne", occurrence: 1 },
  { reference: "126720VTNR", variantKey: "jubilee-black", variantLabel: "Dây Jubilee", bracelet: "Jubilee", nickname: "Sprite", occurrence: 0 },
  { reference: "126720VTNR", variantKey: "oyster-black", variantLabel: "Dây Oyster", bracelet: "Oyster", nickname: "Sprite", occurrence: 1 },
  { reference: "126713GRNR" },
  { reference: "126711CHNR" },
  { reference: "126718GRNR" },
  {
    reference: "126500LN-W",
    sourceReference: "126500LN",
    dialKeywords: ["ホワイト"],
    variantKey: "default",
    variantLabel: "Mặt trắng",
    nickname: "Panda",
  },
  {
    reference: "126500LN-B",
    sourceReference: "126500LN",
    dialKeywords: ["ブラック"],
    variantKey: "default",
    variantLabel: "Mặt đen",
    nickname: "Reverse Panda",
  },
];

const USER_AGENT =
  "REWATCH-price-monitor/1.0 (+https://huyhumg2019.github.io/web-thu-mua-dong-ho/)";

function decodeHtml(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
    yen: "¥",
  };

  return String(value || "")
    .replace(
      /&#(x[0-9a-f]+|\d+);/gi,
      (_, code) => {
        const number = code.toLowerCase().startsWith("x")
          ? Number.parseInt(code.slice(1), 16)
          : Number.parseInt(code, 10);

        return Number.isFinite(number)
          ? String.fromCodePoint(number)
          : "";
      },
    )
    .replace(
      /&([a-z]+);/gi,
      (_, name) => named[name.toLowerCase()] ?? " ",
    );
}

function localizeKameVariant(value) {
  const source = String(value || "").trim();
  const labels = {
    "ブラック": "Mặt đen",
    "ホワイト": "Mặt trắng",
    "ブルー": "Mặt xanh",
    "グレー": "Mặt xám",
    "ブラウン": "Mặt nâu",
    "プラチナ": "Bạch kim",
    "ゴールデン（シャンパン）": "Mặt champagne",
    "ゴールデン(シャンパン)": "Mặt champagne",
    "ブラック/サンダスト": "Mặt đen / Sundust",
    "ロイヤルブルー": "Mặt xanh Royal Blue",
    "Dブルー": "Mặt D-Blue",
    "グレー（ダークロジウム）": "Mặt xám Dark Rhodium",
    "ブラウン（チョコ）": "Mặt nâu chocolate",
  };

  if (labels[source]) {
    return labels[source];
  }

  if (!source) {
    return "Phiên bản tiêu chuẩn";
  }

  const replacements = [
    ["ブライトグリーン", "xanh lá sáng"],
    ["ブライトブラック", "đen bóng"],
    ["ブライトブルー", "xanh lam sáng"],
    ["ゴールデン（シャンパン）", "champagne"],
    ["ゴールデン(シャンパン)", "champagne"],
    ["チョコレート", "chocolate"],
    ["アイスブルー", "xanh băng"],
    ["ロイヤルブルー", "xanh Royal Blue"],
    ["サンダスト", "Sundust"],
    ["シャンパン", "champagne"],
    ["スチール", "thép"],
    ["ブラック", "đen"],
    ["ホワイト", "trắng"],
    ["ゴールデン", "vàng"],
    ["金ブチ", "viền vàng"],
  ];

  let translated = source;

  for (const [japanese, vietnamese] of replacements) {
    translated = translated.replaceAll(japanese, vietnamese);
  }

  return `Mặt ${translated}`;
}

function htmlToText(html) {
  return decodeHtml(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(
        /<\/(?:div|p|li|section|article|h[1-6]|dd|dt)>/gi,
        "\n",
      )
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[\t\r ]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function readAttribute(tag, attribute) {
  const match = tag.match(
    new RegExp(
      `\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
      "i",
    ),
  );

  return decodeHtml(
    match?.[1] ?? match?.[2] ?? match?.[3] ?? "",
  );
}

function parseImages(html) {
  const images = [];

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const alt = readAttribute(tag, "alt");
    const source =
      readAttribute(tag, "data-original") ||
      readAttribute(tag, "data-src") ||
      readAttribute(tag, "src");

    if (!source || !alt) {
      continue;
    }

    try {
      images.push({
        alt,
        url: new URL(source, KAME_URL).href,
      });
    } catch {
      // Bỏ qua URL ảnh không hợp lệ.
    }
  }

  return images;
}

function parseListings(html) {
  const text = htmlToText(html);
  const rolexStart = text.indexOf("ROLEX 商品買取例");
  const rolexEnd = text.indexOf(
    "OMEGA 商品買取例",
    rolexStart,
  );

  if (rolexStart < 0 || rolexEnd < 0) {
    throw new Error(
      "Không xác định được khu vực sản phẩm Rolex trên Kame.",
    );
  }

  const rolexText = text.slice(rolexStart, rolexEnd);
  const listings = [];
  const pattern =
    /新品買取価格\s*[～〜~]?\s*([0-9,]+)\s*万円([\s\S]*?)(?=新品買取価格|$)/g;

  for (const match of rolexText.matchAll(pattern)) {
    const newPrice = Number(match[1].replaceAll(",", ""));
    const details = match[2];

    const usedMatch = details.match(
      /中古買取価格\s*[～〜~]?\s*([0-9,]+)\s*万円/,
    );
    const referenceMatch = details.match(
      /Ref\.?\s*([0-9A-Z-]+)/i,
    );
    const modelMatch = details.match(
      /ROLEX\s+([^\n]+?)\s+Ref\.?\s*[0-9A-Z-]+/i,
    );

    if (
      !referenceMatch ||
      !modelMatch ||
      !Number.isFinite(newPrice)
    ) {
      continue;
    }

    const afterReference = details.slice(
      (referenceMatch.index || 0) +
        referenceMatch[0].length,
    );

    const variant = afterReference
      .split(/\bROLEX\b/i)[0]
      .trim()
      .split("\n")[0]
      .trim();

    listings.push({
      brand: "Rolex",
      model: modelMatch[1].trim(),
      reference: referenceMatch[1].toUpperCase(),
      newPriceManYen: newPrice,
      usedPriceManYen: usedMatch
        ? Number(usedMatch[1].replaceAll(",", ""))
        : null,
      variant,
    });
  }

  return listings;
}

function hashText(value) {
  let hash = 2166136261;

  for (const character of String(value || "")) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function deriveCatalogIdentity(listing) {
  const reference = listing.reference;
  const kameModel = listing.model;

  if (/Daytona/i.test(kameModel)) {
    let model = "Daytona";

    if (reference === "126500LN") model = "Thép Oystersteel";
    else if (/^126503/.test(reference)) model = "Rolesor vàng";
    else if (/^126519/.test(reference)) model = "Vàng trắng 18K, dây Oysterflex";
    else if (/^126509/.test(reference)) model = "Vàng trắng 18K";
    else if (/^126518/.test(reference)) model = "Vàng vàng 18K, dây Oysterflex";
    else if (/^126508/.test(reference)) model = "Vàng vàng 18K";
    else if (/^126515/.test(reference)) model = "Vàng Everose 18K, dây Oysterflex";
    else if (/^126505/.test(reference)) model = "Vàng Everose 18K";
    else if (/^126506/.test(reference)) model = "Bạch kim";

    return { family: "Cosmograph Daytona", model };
  }

  if (/GMT Master/i.test(kameModel)) {
    const models = {
      "126710BLNR": "Vành đen – xanh",
      "126710GRNR": "Vành xám – đen",
      "126720VTNR": "Sprite",
      "126711CHNR": "Root Beer",
      "126713GRNR": "Rolesor vàng, vành xám – đen",
      "126718GRNR": "Vàng vàng, vành xám – đen",
    };

    return {
      family: "GMT-Master II",
      model: models[reference] || "GMT-Master II",
    };
  }

  if (/ExplorerⅡ/i.test(kameModel)) {
    return { family: "Explorer II", model: "Explorer II 42" };
  }

  if (/Explorer/i.test(kameModel)) {
    return {
      family: "Explorer",
      model: kameModel
        .replace("ExplorerⅠ", "Explorer")
        .trim(),
    };
  }

  if (/Submariner Date/i.test(kameModel)) {
    const models = {
      "126610LN": "Mặt đen, vành đen",
      "126610LV": "Starbucks",
      "126613LB": "Rolesor vàng, mặt xanh",
      "126613LN": "Rolesor vàng, mặt đen",
      "126618LB": "Vàng vàng, mặt xanh",
    };

    return {
      family: "Submariner Date",
      model: models[reference] || "Submariner Date",
    };
  }

  if (/Submariner/i.test(kameModel)) {
    return { family: "Submariner", model: "No Date" };
  }

  if (/Sea-Dweller Deep Sea/i.test(kameModel)) {
    return { family: "Deepsea", model: "Deepsea 44" };
  }

  if (/Sea Dweller/i.test(kameModel)) {
    return { family: "Sea-Dweller", model: "Sea-Dweller 43" };
  }

  if (/Yacht Master/i.test(kameModel)) {
    const models = {
      "126622": "Yacht-Master 40 Rolesium",
      "126621": "Yacht-Master 40 Everose Rolesor",
    };

    return {
      family: "Yacht-Master",
      model: models[reference] || "Yacht-Master 40",
    };
  }

  if (/Air King/i.test(kameModel)) {
    return { family: "Air-King", model: "Air-King 40" };
  }

  return { family: kameModel, model: kameModel };
}

function buildTargets(listings) {
  const targets = [];
  const specialReferences = new Set(
    SPECIAL_TARGETS.map(
      (target) => target.sourceReference || target.reference,
    ),
  );

  for (const target of SPECIAL_TARGETS) {
    if (chooseListing(listings, target)) {
      targets.push(target);
    }
  }

  const referenceOrders = new Map();
  const duplicateOrders = new Map();

  for (const listing of listings) {
    if (specialReferences.has(listing.reference)) {
      continue;
    }

    const duplicateKey =
      `${listing.reference}\u0000${listing.variant}`;
    const occurrence = duplicateOrders.get(duplicateKey) || 0;
    const displayOrder =
      referenceOrders.get(listing.reference) || 0;

    duplicateOrders.set(duplicateKey, occurrence + 1);
    referenceOrders.set(listing.reference, displayOrder + 1);

    targets.push({
      reference: listing.reference,
      sourceReference: listing.reference,
      variantKey:
        `kame-${hashText(listing.variant)}-${occurrence}`,
      variantLabel: localizeKameVariant(listing.variant),
      dialKeywords: [listing.variant],
      occurrence,
      displayOrder,
    });
  }

  return targets;
}

function findImage(images, sourceReference, keywords, occurrence = 0) {
  const matches = images.filter((image) => {
    const normalizedAlt = image.alt.toUpperCase();
    const referenceIndex = normalizedAlt.indexOf(sourceReference);
    const characterAfterReference = normalizedAlt[
      referenceIndex + sourceReference.length
    ];
    const hasExactReference =
      referenceIndex >= 0 &&
      !/[0-9A-Z]/.test(characterAfterReference || "");

    return (
      hasExactReference &&
      keywords.every((keyword) =>
        image.alt.includes(keyword),
      )
    );
  });

  return matches[occurrence]?.url || matches[0]?.url || "";
}

function chooseListing(listings, target) {
  const sourceReference =
    target.sourceReference || target.reference;

  let candidates = listings.filter(
    (listing) =>
      listing.reference === sourceReference,
  );

  if (target.dialKeywords?.length) {
    candidates = candidates.filter((listing) =>
      target.dialKeywords.every((keyword) =>
        listing.variant.includes(keyword),
      ),
    );
  }

  if (!candidates.length) {
    return null;
  }

  // Một Reference có thể có nhiều dây hoặc mặt số.
  // Chọn mức thấp nhất để tránh báo giá thu mua quá cao.
  if (Number.isInteger(target.occurrence)) {
    return candidates[target.occurrence] || null;
  }

  return [...candidates].sort(
    (first, second) =>
      first.newPriceManYen - second.newPriceManYen,
  )[0];
}

function calculateVndMillions(
  sourcePriceManYen,
  bufferManYen,
  jpyToVnd,
) {
  if (!Number.isFinite(sourcePriceManYen)) {
    return null;
  }

  const safeManYen = Math.max(
    sourcePriceManYen - bufferManYen,
    0,
  );

  return Math.round(
    (safeManYen * 10_000 * jpyToVnd) / 1_000_000,
  );
}

function isSuspiciousJump(current, next, hasHistory) {
  if (
    !hasHistory ||
    !Number.isFinite(Number(current)) ||
    Number(current) <= 0 ||
    !Number.isFinite(next)
  ) {
    return false;
  }

  return (
    Math.abs(next - Number(current)) /
      Number(current) >
    0.15
  );
}

async function supabaseRequest(path, options = {}) {
  const baseUrl = process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !serviceKey) {
    throw new Error(
      "Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}${path}`,
    {
      ...options,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        ...(options.headers || {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Supabase ${response.status}: ${await response.text()}`,
    );
  }

  if (response.status === 204) {
    return null;
  }

  const responseText = await response.text();

  return responseText
    ? JSON.parse(responseText)
    : null;
}

async function uploadImage(reference, sourceUrl) {
  if (!sourceUrl) {
    return "";
  }

  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: KAME_URL,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Không tải được ảnh ${response.status}`,
    );
  }

  const contentType =
    response.headers.get("content-type")?.split(";")[0] ||
    "";

  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };

  const extension = extensions[contentType];

  if (!extension) {
    throw new Error(
      `Định dạng ảnh không hỗ trợ: ${contentType}`,
    );
  }

  const buffer = await response.arrayBuffer();

  if (buffer.byteLength > 5 * 1024 * 1024) {
    throw new Error("Ảnh Kame lớn hơn 5 MB.");
  }

  const path =
    `kame/${reference.toLowerCase()}.${extension}`;

  await supabaseRequest(
    `/storage/v1/object/purchase-price-images/${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buffer,
    },
  );

  return (
    `${process.env.SUPABASE_URL.replace(/\/$/, "")}` +
    `/storage/v1/object/public/purchase-price-images/${path}`
  );
}


async function resolveJpyToVndRate(existingRows) {
  const manualRate = Number(process.env.JPY_TO_VND_RATE);

  if (Number.isFinite(manualRate) && manualRate > 0) {
    return {
      rate: manualRate,
      source: "manual",
      checkedAt: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch(SENDMONEY_RATE_URL, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "vi,en;q=0.8",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(
        "SendMoney trả về HTTP " + response.status + ".",
      );
    }

    const html = await response.text();
    const pageText = htmlToText(html);
    const rateMatch = pageText.match(
      /Viet Nam Dong\s*\(VND\)\s*VND\s*([0-9]+(?:[.,][0-9]+)?)/i,
    );
    const listedRate = Number(
      String(rateMatch?.[1] || "").replace(",", "."),
    );

    if (!Number.isFinite(listedRate) || listedRate <= 0) {
      throw new Error(
        "Không đọc được tỷ giá JPY/VND từ SendMoney.",
      );
    }

    const adjustedRate = Math.max(
      listedRate + SENDMONEY_RATE_ADJUSTMENT_VND,
      0,
    );

    console.log(
      `Tỷ giá DCOM: ${listedRate} - 2 = ` +
        `${adjustedRate} VND/JPY.`,
    );

    return {
      rate: adjustedRate,
      source: "dcom-vnd-minus-2",
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    const previous = [...existingRows]
      .filter(
        (row) =>
          Number.isFinite(
            Number(row.source_exchange_rate_jpy_vnd),
          ) &&
          Number(row.source_exchange_rate_jpy_vnd) > 0,
      )
      .sort(
        (first, second) =>
          new Date(
            second.source_exchange_rate_checked_at || 0,
          ) -
          new Date(
            first.source_exchange_rate_checked_at || 0,
          ),
      )[0];

    if (previous) {
      console.warn(
        "Không lấy được tỷ giá mới: " + error.message +
          " Dùng tỷ giá gần nhất " +
          previous.source_exchange_rate_jpy_vnd + ".",
      );

      return {
        rate: Number(
          previous.source_exchange_rate_jpy_vnd,
        ),
        source: "last-successful-rate",
        checkedAt:
          previous.source_exchange_rate_checked_at ||
          new Date().toISOString(),
      };
    }

    throw new Error(
      "Không lấy được tỷ giá JPY/VND và chưa có tỷ giá dự phòng: " +
        error.message,
    );
  }
}

async function main() {
  const applyChanges =
    process.env.APPLY_CHANGES === "true";
  const bufferManYen = Number(
    process.env.KAME_BUFFER_MAN_YEN || "20",
  );

  if (
    !Number.isFinite(bufferManYen) ||
    bufferManYen < 0
  ) {
    throw new Error(
      "KAME_BUFFER_MAN_YEN phải từ 0 trở lên.",
    );
  }

  const response = await fetch(KAME_URL, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "ja,en;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Kame trả về HTTP ${response.status}.`,
    );
  }

  const html = await response.text();
  const listings = parseListings(html);
  const images = parseImages(html);
  const targets = buildTargets(listings);

  if (listings.length < 20 || targets.length < 20) {
    throw new Error(
      `Chỉ đọc được ${listings.length} sản phẩm Rolex; ` +
        "dừng để bảo vệ dữ liệu.",
    );
  }

  let existingRows = [];
  let existingVariants = [];

  if (applyChanges) {
    existingRows =
      (await supabaseRequest(
        "/rest/v1/purchase_prices" +
          "?select=reference,brand,family,model,active,price_mode," +
          "auto_new_price_million_vnd," +
          "auto_used_price_million_vnd," +
          "source_last_success_at," +
          "source_exchange_rate_jpy_vnd," +
          "source_exchange_rate_checked_at" +
          "&brand=eq.Rolex",
      )) || [];

    existingVariants =
      (await supabaseRequest(
        "/rest/v1/purchase_price_variants" +
          "?select=reference,variant_key,active,price_mode",
      )) || [];
  }

  const exchangeRate = await resolveJpyToVndRate(
    existingRows,
  );
  const jpyToVnd = exchangeRate.rate;

  const existingByReference = new Map(
    existingRows.map((row) => [
      row.reference,
      row,
    ]),
  );

  const report = [];

  for (const target of targets) {
    const sourceReference =
      target.sourceReference || target.reference;
    const current =
      existingByReference.get(target.reference);
    const listing = chooseListing(listings, target);

    if (!listing) {
      let status = "not-found";
      const sourceStillAvailable = listings.some(
        (candidate) =>
          candidate.reference === sourceReference &&
          (target.dialKeywords || []).every(
            (keyword) =>
              candidate.variant.includes(keyword),
          ),
      );

      if (
        applyChanges &&
        current?.price_mode !== "manual"
      ) {
        if (target.variantKey && sourceStillAvailable) {
          await supabaseRequest(
            "/rest/v1/purchase_price_variants" +
              `?reference=eq.${encodeURIComponent(target.reference)}` +
              `&variant_key=eq.${encodeURIComponent(target.variantKey)}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify({ active: false }),
            },
          );
          status = "hidden-missing-variant";
        } else if (!sourceStillAvailable) {
          await supabaseRequest(
            "/rest/v1/purchase_prices" +
              `?reference=eq.${encodeURIComponent(target.reference)}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify({ active: false }),
            },
          );
          status = "hidden-missing-from-kame";
        }
      }

      report.push({
        reference: target.reference,
        variantKey: target.variantKey || "default",
        status,
      });
      continue;
    }

    const keywords = target.dialKeywords || [];
    const sourceImageUrl = findImage(
      images,
      sourceReference,
      keywords,
      target.occurrence || 0,
    );

    const autoNewPrice = calculateVndMillions(
      listing.newPriceManYen,
      bufferManYen,
      jpyToVnd,
    );
    const autoUsedPrice = calculateVndMillions(
      listing.usedPriceManYen,
      bufferManYen,
      jpyToVnd,
    );

    const hasHistory =
      !target.variantKey &&
      Boolean(current?.source_last_success_at);

    if (
      isSuspiciousJump(
        current?.auto_new_price_million_vnd,
        autoNewPrice,
        hasHistory,
      ) ||
      (
        autoUsedPrice !== null &&
        isSuspiciousJump(
          current?.auto_used_price_million_vnd,
          autoUsedPrice,
          hasHistory,
        )
      )
    ) {
      report.push({
        reference: target.reference,
        status: "rejected-jump-over-15-percent",
        autoNewPrice,
        autoUsedPrice,
      });
      continue;
    }

    const reportRow = {
      reference: target.reference,
      sourceReference,
      variant: listing.variant,
      sourceNewPriceManYen:
        listing.newPriceManYen,
      sourceUsedPriceManYen:
        listing.usedPriceManYen,
      autoNewPrice,
      autoUsedPrice,
      sourceImageUrl,
      status: applyChanges ? "pending" : "preview",
    };

    if (applyChanges) {
      let localImageUrl = "";

      try {
        localImageUrl = await uploadImage(
          `${target.reference}-${target.variantKey || "default"}`,
          sourceImageUrl,
        );
      } catch (error) {
        reportRow.imageWarning = error.message;
      }

      const now = new Date().toISOString();
      const identity = deriveCatalogIdentity(listing);
      const changes = {
        reference: target.reference,
        active: true,
        auto_new_price_million_vnd: autoNewPrice,
        price_source: "kame-kichi",
        source_url: KAME_URL,
        source_checked_at: now,
        source_last_success_at: now,
        source_new_price_man_yen:
          listing.newPriceManYen,
        source_used_price_man_yen:
          listing.usedPriceManYen,
        source_variant: listing.variant,
        source_image_url: sourceImageUrl || null,
        source_exchange_rate_jpy_vnd: jpyToVnd,
        source_exchange_rate_source: exchangeRate.source,
        source_exchange_rate_checked_at:
          exchangeRate.checkedAt,
        auto_calculated_at: now,
      };

      if (autoUsedPrice !== null) {
        changes.auto_used_price_million_vnd =
          autoUsedPrice;
      }

      if (localImageUrl) {
        changes.image_url = localImageUrl;
      }

      if (!current) {
        changes.brand = "Rolex";
        changes.family = identity.family;
        changes.model = identity.model;
        changes.new_price_million_vnd = autoNewPrice || 0;
        changes.used_price_million_vnd = autoUsedPrice || 0;
      }

      await supabaseRequest(
        "/rest/v1/purchase_prices?on_conflict=reference",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(changes),
        },
      );

      const variantChanges = {
        reference: target.reference,
        variant_key: target.variantKey || "default",
        variant_label:
          target.variantLabel ||
          localizeKameVariant(listing.variant),
        dial: localizeKameVariant(listing.variant),
        display_order:
          target.displayOrder ?? target.occurrence ?? 0,
        active: true,
        auto_new_price_million_vnd: autoNewPrice,
        auto_used_price_million_vnd: autoUsedPrice,
        source_name: "kame-kichi",
        source_url: KAME_URL,
        source_reference: sourceReference,
        source_new_price_man_yen: listing.newPriceManYen,
        source_used_price_man_yen: listing.usedPriceManYen,
        source_checked_at: now,
        fx_jpy_vnd: jpyToVnd,
        buffer_man_yen: bufferManYen,
      };

      if (target.nickname) {
        variantChanges.nickname = target.nickname;
      }

      if (target.bracelet) {
        variantChanges.bracelet = target.bracelet;
      }

      if (localImageUrl) {
        variantChanges.image_url = localImageUrl;
      }

      await supabaseRequest(
        "/rest/v1/purchase_price_variants?on_conflict=reference,variant_key",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(variantChanges),
        },
      );

      reportRow.status = "updated";
      reportRow.imageUrl = localImageUrl;
      reportRow.displayMode =
        current?.price_mode || "auto";
    }

    report.push(reportRow);
  }

  if (applyChanges) {
    const syncedReferences = new Set(
      targets.map((target) => target.reference),
    );
    const rolexReferences = new Set([
      ...existingRows.map((row) => row.reference),
      ...syncedReferences,
    ]);
    const syncedVariants = new Set(
      targets.map(
        (target) =>
          `${target.reference}\u0000${target.variantKey || "default"}`,
      ),
    );

    for (const row of existingRows) {
      if (
        row.active &&
        row.price_mode !== "manual" &&
        !syncedReferences.has(row.reference)
      ) {
        await supabaseRequest(
          "/rest/v1/purchase_prices" +
            `?reference=eq.${encodeURIComponent(row.reference)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ active: false }),
          },
        );

        report.push({
          reference: row.reference,
          status: "hidden-missing-from-kame",
        });
      }
    }

    for (const variant of existingVariants) {
      const variantIdentity =
        `${variant.reference}\u0000${variant.variant_key}`;

      if (
        rolexReferences.has(variant.reference) &&
        variant.active &&
        variant.price_mode !== "manual" &&
        !syncedVariants.has(variantIdentity)
      ) {
        await supabaseRequest(
          "/rest/v1/purchase_price_variants" +
            `?reference=eq.${encodeURIComponent(variant.reference)}` +
            `&variant_key=eq.${encodeURIComponent(variant.variant_key)}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ active: false }),
          },
        );

        report.push({
          reference: variant.reference,
          variantKey: variant.variant_key,
          status: "hidden-missing-variant",
        });
      }
    }
  }

  const matched = report.filter(
    (row) =>
      row.status === "preview" ||
      row.status === "updated",
  ).length;

  if (matched < 20) {
    throw new Error(
      `Chỉ khớp ${matched} mẫu mục tiêu; không đủ an toàn.`,
    );
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: KAME_URL,
    applyChanges,
    jpyToVnd,
    exchangeRateSource: exchangeRate.source,
    exchangeRateCheckedAt: exchangeRate.checkedAt,
    bufferManYen,
    parsedListings: listings.length,
    matchedTargets: matched,
    rows: report,
  };

  await writeFile(
    "kame-sync-report.json",
    JSON.stringify(output, null, 2),
  );

  console.log(JSON.stringify(output, null, 2));
}

main().catch(async (error) => {
  console.error(error);

  await writeFile(
    "kame-sync-report.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        error: error.message,
      },
      null,
      2,
    ),
  );

  process.exitCode = 1;
});

import { writeFile } from "node:fs/promises";

const KAME_URL =
  "https://www.kame-kichi.com/buy/examples";
const VIETCOMBANK_RATE_URL =
  "https://www.vietcombank.com.vn/ExchangeRates/ExrateXML.aspx";

const TARGETS = [
  { reference: "126710BLRO" },
  { reference: "126710BLNR", variantKey: "jubilee-black", variantLabel: "Dây Jubilee", bracelet: "Jubilee", occurrence: 0 },
  { reference: "126710BLNR", variantKey: "oyster-black", variantLabel: "Dây Oyster", bracelet: "Oyster", occurrence: 1 },
  { reference: "126710GRNR", variantKey: "jubilee-black", variantLabel: "Dây Jubilee", bracelet: "Jubilee", occurrence: 0 },
  { reference: "126710GRNR", variantKey: "oyster-black", variantLabel: "Dây Oyster", bracelet: "Oyster", occurrence: 1 },
  { reference: "126720VTNR", variantKey: "jubilee-black", variantLabel: "Dây Jubilee", bracelet: "Jubilee", occurrence: 0 },
  { reference: "126720VTNR", variantKey: "oyster-black", variantLabel: "Dây Oyster", bracelet: "Oyster", occurrence: 1 },
  { reference: "126713GRNR" },
  { reference: "126711CHNR" },
  { reference: "126718GRNR" },
  {
    reference: "126500LN-W",
    sourceReference: "126500LN",
    dialKeywords: ["ホワイト"],
  },
  {
    reference: "126500LN-B",
    sourceReference: "126500LN",
    dialKeywords: ["ブラック"],
  },
  { reference: "126503" },
  { reference: "126508" },
  { reference: "126505" },
  { reference: "126506" },
  { reference: "124060" },
  { reference: "126610LN" },
  { reference: "126610LV" },
  { reference: "126613LB" },
  { reference: "126618LB" },
  { reference: "126300" },
  { reference: "126334" },
  { reference: "126233" },
  { reference: "126333" },
  { reference: "124270" },
  { reference: "226570" },
  { reference: "126900" },
  { reference: "126622" },
  { reference: "126621" },
  { reference: "226659" },
  { reference: "336934" },
  { reference: "126600" },
  { reference: "136660" },
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
  const listings = [];
  const pattern =
    /新品買取価格\s*[～〜~]?\s*([0-9,]+)\s*万円([\s\S]*?)(?=新品買取価格|$)/g;

  for (const match of text.matchAll(pattern)) {
    const newPrice = Number(match[1].replaceAll(",", ""));
    const details = match[2];

    const usedMatch = details.match(
      /中古買取価格\s*[～〜~]?\s*([0-9,]+)\s*万円/,
    );
    const referenceMatch = details.match(
      /Ref\.?\s*([0-9A-Z-]+)/i,
    );

    if (!referenceMatch || !Number.isFinite(newPrice)) {
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

function findImage(images, sourceReference, keywords, occurrence = 0) {
  const matches = images.filter((image) => {
    const normalizedAlt = image.alt.toUpperCase();

    return (
      normalizedAlt.includes(sourceReference) &&
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
    const response = await fetch(VIETCOMBANK_RATE_URL, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(
        "Vietcombank trả về HTTP " + response.status + ".",
      );
    }

    const xml = await response.text();
    const jpyTag = Array.from(
      xml.matchAll(/<Exrate\b[^>]*>/gi),
    )
      .map((match) => match[0])
      .find(
        (tag) =>
          readAttribute(tag, "CurrencyCode").toUpperCase() ===
          "JPY",
      );

    const transferRate = Number(
      readAttribute(jpyTag || "", "Transfer").replaceAll(
        ",",
        "",
      ),
    );

    if (!Number.isFinite(transferRate) || transferRate <= 0) {
      throw new Error(
        "Không đọc được tỷ giá chuyển khoản JPY từ Vietcombank.",
      );
    }

    return {
      rate: transferRate,
      source: "vietcombank-transfer",
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

  if (listings.length < 10) {
    throw new Error(
      `Chỉ đọc được ${listings.length} sản phẩm; dừng để bảo vệ dữ liệu.`,
    );
  }

  let existingRows = [];

  if (applyChanges) {
    existingRows =
      (await supabaseRequest(
        "/rest/v1/purchase_prices" +
          "?select=reference,price_mode," +
          "auto_new_price_million_vnd," +
          "auto_used_price_million_vnd," +
          "source_last_success_at," +
          "source_exchange_rate_jpy_vnd," +
          "source_exchange_rate_checked_at" +
          "&brand=eq.Rolex&active=eq.true",
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

  for (const target of TARGETS) {
    const sourceReference =
      target.sourceReference || target.reference;
    const listing = chooseListing(listings, target);

    if (!listing) {
      report.push({
        reference: target.reference,
        status: "not-found",
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

    const current =
      existingByReference.get(target.reference);
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
      const changes = {
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

      await supabaseRequest(
        "/rest/v1/purchase_prices" +
          `?reference=eq.${encodeURIComponent(target.reference)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify(changes),
        },
      );

      if (target.variantKey) {
        const variantChanges = {
          reference: target.reference,
          variant_key: target.variantKey,
          variant_label: target.variantLabel,
          bracelet: target.bracelet || null,
          dial: listing.variant || null,
          display_order: target.occurrence || 0,
          active: true,
          price_mode: "auto",
          auto_new_price_million_vnd: autoNewPrice,
          auto_used_price_million_vnd: autoUsedPrice,
          image_url: localImageUrl || null,
          source_name: "kame-kichi",
          source_url: KAME_URL,
          source_reference: sourceReference,
          source_new_price_man_yen: listing.newPriceManYen,
          source_used_price_man_yen: listing.usedPriceManYen,
          source_checked_at: now,
          fx_jpy_vnd: jpyToVnd,
          buffer_man_yen: bufferManYen,
        };

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
      }

      reportRow.status = "updated";
      reportRow.imageUrl = localImageUrl;
      reportRow.displayMode =
        current?.price_mode || "auto";
    }

    report.push(reportRow);
  }

  const matched = report.filter(
    (row) =>
      row.status === "preview" ||
      row.status === "updated",
  ).length;

  if (matched < 5) {
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

(() => {
  const facebook = "https://www.facebook.com/profile.php?id=61594430955885&locale=vi_VN";
  const help = [
    {
      label: "Bán đồng hồ",
      match: /thu mua|bán đồng hồ|bán chiếc|báo giá|định giá|muốn bán|giá|bao nhiêu|reference|mã ref|sell|買取/i,
      answer: "Bạn gửi mã Reference của đồng hồ, mình sẽ tra giá thu mua ngay. Nếu chưa biết mã, bạn có thể gửi ảnh qua Facebook để LUXTIME hỗ trợ.",
      link: { text: "Xem giá thu mua", href: "index.html#buy" },
    },
    {
      label: "Hàng có sẵn",
      match: /có sẵn|mua đồng hồ|sản phẩm|còn hàng|đặt mua|stock|在庫/i,
      answer: "Bạn xem các mẫu đang đăng ở mục Hàng có sẵn. Hãy liên hệ LUXTIME để xác nhận tình trạng và giá trước khi giao dịch.",
      link: { text: "Xem hàng có sẵn", href: "index.html#available" },
    },
    {
      label: "Bán hộ",
      match: /bán hộ|ký gửi|gửi bán|consign|委託/i,
      answer: "Khi bán hộ, bạn giữ quyền sở hữu đồng hồ. LUXTIME hỗ trợ đăng bán và trao đổi mức phí rõ ràng trước khi nhận bán.",
      link: { text: "Xem dịch vụ bán hộ", href: "index.html#consign" },
    },
    {
      label: "Liên hệ",
      match: /liên hệ|facebook|zalo|instagram|nhân viên|tư vấn|gặp người|contact/i,
      answer: "Bạn có thể nhắn trực tiếp cho LUXTIME qua Facebook. Zalo và Instagram sẽ được bổ sung đường dẫn sau.",
      link: { text: "Nhắn Facebook", href: facebook, external: true },
    },
  ];

  function knownAnswer(input) {
    const normalized = String(input || "").normalize("NFC").trim();
    if (help[1].match.test(normalized)) return help[1];
    return help.find((entry) => entry.match.test(normalized)) || null;
  }

  function normalizeText(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  }

  function purchaseIntent(value) {
    const text = normalizeText(value);
    if (/ban ho|ky gui|gui ban|consign|委託/.test(text)) return false;
    if (/thu mua|muon ban|can ban|ban dong ho|ban chiec|toi ban|minh ban|bao gia|dinh gia|sell|買取/.test(text)) return true;
    if (/muon mua|can mua|tim mua|mua|co san|con hang|stock|buy|在庫/.test(text)) return false;
    return null;
  }

  function requestedReferences(value) {
    // Reference numbers have at least four leading digits; keep full AP/Patek suffixes.
    const matches = String(value).toUpperCase().match(/\b\d{4,6}[A-Z]*(?:\s*[./-]\s*[A-Z0-9]+)*(?:\s+(?:BLRO|BLNR|LN|LV|ST|SO|OR)\b)?\b/g) || [];
    return [...new Set(matches.map((match) => match.replace(/[^A-Z0-9]/g, "")))]
      .filter((ref) => !/^\d{4}$/.test(ref) || Number(ref) < 1900 || Number(ref) > 2099);
  }

  function lookupReferences(question, previous) {
    const refs = requestedReferences(question);
    if (!refs.length) return [];
    let intent = purchaseIntent(question);
    if (intent === null) {
      for (const message of [...previous].reverse()) {
        if (message.role !== "user") continue;
        intent = purchaseIntent(message.content);
        if (intent !== null) break;
      }
    }
    return intent === false ? [] : refs;
  }

  function priceLabel(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 1
      ? `~${(Math.floor(amount) * 1000000).toLocaleString("vi-VN")}đ`
      : "cần liên hệ báo giá";
  }

  async function lookupPurchase(refs, config) {
    if (!config?.url || !config?.publishableKey) throw new Error("Catalog unavailable");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const answers = [];
      for (const ref of refs.slice(0, 3)) {
        const url = new URL(`${config.url}/rest/v1/purchase_catalog_variants`);
        url.searchParams.set("select", "reference,brand,family,model,variant_label,bracelet,dial,new_price_million_vnd,used_price_million_vnd");
        // Query a narrow numeric prefix, then match normalized references exactly.
        url.searchParams.set("reference", `ilike.${ref.match(/^\d+/)[0]}*`);
        url.searchParams.set("order", "reference,display_order,variant_id");
        url.searchParams.set("limit", "101");
        const response = await fetch(url, {
          headers: { apikey: config.publishableKey }, signal: controller.signal,
        });
        if (!response.ok) throw new Error("Catalog request failed");
        const rows = await response.json();
        if (!Array.isArray(rows)) throw new Error("Invalid catalog response");
        const exact = rows.filter((row) => String(row.reference).toUpperCase().replace(/[^A-Z0-9]/g, "") === ref);
        const matches = exact.length ? exact : rows.filter((row) => String(row.reference).toUpperCase().replace(/[^A-Z0-9]/g, "").startsWith(ref));
        if (!matches.length) {
          answers.push(rows.length === 101
            ? `Mã ${ref}: có quá nhiều phiên bản để xác định chính xác. Bạn vui lòng gửi mã đầy đủ và ảnh qua Facebook để LUXTIME kiểm tra.`
            : `Chưa tìm thấy mã ${ref} trong bảng giá thu mua. Bạn vui lòng gửi mã và ảnh đồng hồ qua Facebook để LUXTIME kiểm tra, báo giá.`);
          continue;
        }
        answers.push(`Giá thu mua dự kiến cho ${ref}:`);
        for (const row of matches.slice(0, 5)) {
          const name = [row.brand, row.family, row.model, row.reference, row.variant_label || row.bracelet || row.dial].filter(Boolean).join(" · ");
          answers.push(`${name}: hàng mới ${priceLabel(row.new_price_million_vnd)}; đã sử dụng ${priceLabel(row.used_price_million_vnd)}.`);
        }
        if (matches.length > 5 || rows.length === 101) answers.push("Đây là một số phiên bản phù hợp. Gửi ảnh qua Facebook để xác định đúng phiên bản của bạn.");
      }
      if (refs.length > 3) answers.push("Mình tra tối đa 3 mã mỗi lượt; bạn gửi riêng các mã còn lại nhé.");
      answers.push("Giá chốt cần kiểm tra tình trạng, hộp và giấy tờ thực tế. Bạn có thể nhắn Facebook để được hỗ trợ.");
      return answers.join("\n\n");
    } finally {
      clearTimeout(timer);
    }
  }

  // Keep this available for a small, network-free behavior check.
  window.LUXTIME_CHAT_HELP = { knownAnswer, lookupReferences, lookupPurchase };

  const root = document.createElement("aside");
  root.className = "lux-chat";
  root.setAttribute("aria-label", "Trợ lý LUXTIME");
  root.innerHTML = `
    <button class="lux-chat-toggle" type="button" aria-label="Mở chat với LUXTIME" aria-expanded="false">Chat với LUXTIME</button>
    <section class="lux-chat-panel" aria-label="Chat với LUXTIME" hidden>
      <header class="lux-chat-header"><div><strong>LUXTIME</strong><small>Trợ lý tự động</small></div><button class="lux-chat-close" type="button" aria-label="Đóng chat">×</button></header>
      <div class="lux-chat-messages" role="log" aria-live="polite" aria-relevant="additions text"></div>
      <div class="lux-chat-suggestions" aria-label="Câu hỏi thường gặp"></div>
      <form class="lux-chat-form"><label class="lux-chat-sr" for="lux-chat-input">Câu hỏi của bạn</label><input id="lux-chat-input" maxlength="500" autocomplete="off" placeholder="Nhập câu hỏi..." required><button type="submit" aria-label="Gửi câu hỏi">Gửi</button></form>
    </section>`;
  document.body.append(root);

  const toggle = root.querySelector(".lux-chat-toggle");
  const panel = root.querySelector(".lux-chat-panel");
  const close = root.querySelector(".lux-chat-close");
  const messages = root.querySelector(".lux-chat-messages");
  const suggestions = root.querySelector(".lux-chat-suggestions");
  const form = root.querySelector(".lux-chat-form");
  const input = root.querySelector("#lux-chat-input");
  const submit = form.querySelector('button[type="submit"]');
  const history = [];

  function appendMessage(text, sender, link) {
    const bubble = document.createElement("div");
    bubble.className = `lux-chat-message lux-chat-message-${sender}`;
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    bubble.append(paragraph);
    if (link) {
      const anchor = document.createElement("a");
      anchor.textContent = link.text;
      anchor.href = link.href;
      if (link.external) {
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
      }
      bubble.append(anchor);
    }
    messages.append(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  appendMessage("Xin chào! Bạn muốn hỏi về thu mua, hàng có sẵn hay bán hộ?", "bot");
  for (const item of help) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.label;
    button.addEventListener("click", () => ask(item.label));
    suggestions.append(button);
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Ẩn chat LUXTIME" : "Mở chat với LUXTIME");
    if (open) input.focus();
    else toggle.focus();
  }
  toggle.addEventListener("click", () => setOpen(panel.hidden));
  close.addEventListener("click", () => setOpen(false));
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });

  async function ask(question) {
    const value = question.trim();
    if (!value || submit.disabled) return;
    appendMessage(value, "user");
    input.value = "";
    // Reference lookups use the same public catalog as the website, without an AI guess.
    const refs = lookupReferences(value, history);
    if (refs.length) {
      submit.disabled = true;
      submit.textContent = "…";
      let answer;
      try {
        answer = await lookupPurchase(refs, window.REWATCH_SUPABASE);
      } catch {
        answer = "Mình chưa đọc được bảng giá lúc này. Bạn vui lòng gửi mã và ảnh đồng hồ qua Facebook để LUXTIME kiểm tra, báo giá nhé.";
      } finally {
        submit.disabled = false;
        submit.textContent = "Gửi";
      }
      appendMessage(answer, "bot", { text: "Nhắn Facebook", href: facebook, external: true });
      history.push({ role: "user", content: value }, { role: "assistant", content: answer.slice(0, 500) });
      input.focus();
      return;
    }
    const matched = help.find((entry) => entry.label.toLowerCase() === value.toLowerCase());
    if (matched) {
      appendMessage(matched.answer, "bot", matched.link);
      history.push({ role: "user", content: value }, { role: "assistant", content: matched.answer });
      return;
    }

    submit.disabled = true;
    submit.textContent = "…";
    try {
      const config = window.REWATCH_SUPABASE;
      if (!config?.url || !config?.publishableKey || !config?.anonKey) throw new Error("Chat unavailable");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      let response;
      try {
        response = await fetch(`${config.url}/functions/v1/website-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: config.publishableKey,
            Authorization: `Bearer ${config.anonKey}`,
          },
          body: JSON.stringify({ messages: [...history.slice(-6), { role: "user", content: value }] }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) throw new Error("Chat request failed");
      const data = await response.json();
      if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error("Empty chat answer");
      appendMessage(data.answer, "bot", data.link === "facebook" ? { text: "Nhắn Facebook", href: facebook, external: true } : null);
      if (Array.isArray(data.links)) {
        const bubble = messages.lastElementChild;
        for (const item of data.links.slice(0, 4)) {
          if (typeof item?.text !== "string" || typeof item?.href !== "string") continue;
          const url = new URL(item.href, location.href);
          if (url.origin !== location.origin || url.pathname !== "/") continue;
          const anchor = document.createElement("a");
          anchor.textContent = item.text;
          anchor.href = url.href;
          anchor.className = "lux-chat-catalog-link";
          bubble.append(anchor);
        }
      }
      history.push({ role: "user", content: value }, { role: "assistant", content: data.answer });
    } catch {
      appendMessage("Mình chưa trả lời được câu hỏi này. Bạn vui lòng nhắn Facebook để LUXTIME hỗ trợ trực tiếp nhé.", "bot", { text: "Nhắn Facebook", href: facebook, external: true });
    } finally {
      submit.disabled = false;
      submit.textContent = "Gửi";
      input.focus();
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(input.value);
  });
})();

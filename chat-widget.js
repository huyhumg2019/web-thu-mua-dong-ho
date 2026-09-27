(() => {
  const facebook = "https://www.facebook.com/profile.php?id=61594430955885&locale=vi_VN";
  const help = [
    {
      label: "Bán đồng hồ",
      match: /thu mua|bán đồng hồ|bán chiếc|báo giá|định giá|muốn bán|giá|bao nhiêu|reference|mã ref|sell|買取/i,
      answer: "Bạn có thể tra mã Reference ở trang Thu mua rồi gửi thông tin và ảnh đồng hồ. Giá trên web là dự kiến; LUXTIME sẽ xác nhận giá sau khi kiểm tra tình trạng thực tế.",
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

  // Keep this available for a small, network-free behavior check.
  window.LUXTIME_CHAT_HELP = { knownAnswer };

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
    const matched = knownAnswer(value);
    if (matched) {
      appendMessage(matched.answer, "bot", matched.link);
      history.push({ role: "user", content: value }, { role: "assistant", content: matched.answer });
      return;
    }

    submit.disabled = true;
    submit.textContent = "…";
    try {
      const config = window.REWATCH_SUPABASE;
      if (!config?.url || !config?.publishableKey) throw new Error("Chat unavailable");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      let response;
      try {
        response = await fetch(`${config.url}/functions/v1/website-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: config.publishableKey,
            Authorization: `Bearer ${config.publishableKey}`,
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

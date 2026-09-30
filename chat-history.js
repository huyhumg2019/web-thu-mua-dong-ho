(() => {
  const conversation = crypto.randomUUID();
  const token = crypto.randomUUID();
  let queue = Promise.resolve();
  let started = false;
  let failed = false;
  window.luxtimeSaveChat = (text, sender, link) => {
    if (sender === 'user') started = true;
    if (!started) return; // Do not create a record just for opening the widget.
    const message = crypto.randomUUID();
    const content = (text + (link ? `\n${link.text}: ${link.href}` : '')).slice(0, 4000);
    queue = queue.then(async () => {
      const config = window.REWATCH_SUPABASE;
      let saved = false;
      for (let attempt = 0; attempt < 2 && !saved; attempt++) {
        try {
          const response = await fetch(`${config.url}/rest/v1/rpc/append_chat_message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: config.publishableKey },
            body: JSON.stringify({ p_conversation: conversation, p_token: token,
              p_message: message, p_sender: sender, p_content: content }),
            keepalive: true,
            signal: AbortSignal.timeout(8000),
          });
          saved = response.ok && await response.json() === true;
          if (response.ok || (response.status >= 400 && response.status < 500)) break;
        } catch { /* One idempotent retry for transient network failures. */ }
      }
      if (!saved) failed = true;
      const status = document.getElementById('lux-chat-save-status');
      if (status && failed) status.textContent = 'Một số tin chưa lưu được. Nếu cần nhân viên hỗ trợ, vui lòng nhắn Facebook.';
    }).catch(() => {});
  };
})();

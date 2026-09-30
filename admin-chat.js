(() => {
  const section = document.getElementById('admin-chat-section');
  const list = document.getElementById('admin-chat-list');
  const detail = document.getElementById('admin-chat-detail');
  const status = document.getElementById('admin-chat-status');
  const more = document.getElementById('admin-chat-more');
  let generation = 0, detailGeneration = 0, cursor = null;
  const date = (value) => new Date(value).toLocaleString('vi-VN');
  window.clearAdminChats = () => {
    generation++; detailGeneration++;
    list.replaceChildren(); detail.replaceChildren(); section.hidden = true;
    document.getElementById('admin-chat-link').hidden = true;
    cursor = null; status.textContent = '';
  };
  window.loadAdminChats = async (append = false) => {
    if (currentProfile?.role !== 'admin') return;
    section.hidden = false;
    document.getElementById('admin-chat-link').hidden = false;
    const version = ++generation;
    if (!append) { cursor = null; list.replaceChildren(); detail.replaceChildren(); detailGeneration++; }
    more.disabled = true; status.textContent = 'Đang tải hội thoại...';
    const { data, error } = await supabaseClient.rpc('list_admin_chats', { p_before: cursor });
    if (version !== generation || currentProfile?.role !== 'admin') return;
    if (error) { status.textContent = 'Chưa tải được lịch sử chat. Kiểm tra kết nối và thiết lập Supabase.'; more.disabled = false; return; }
    for (const chat of data || []) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${date(chat.created_at)} · ${chat.message_count} tin · ${chat.preview || 'Hội thoại mới'}`;
      button.addEventListener('click', async () => {
        const selected = ++detailGeneration;
        detail.textContent = 'Đang tải nội dung...';
        const { data: messages, error: readError } = await supabaseClient.rpc('get_admin_chat', { p_conversation: chat.id });
        if (selected !== detailGeneration || currentProfile?.role !== 'admin') return;
        detail.replaceChildren();
        if (readError) { detail.textContent = 'Không tải được hội thoại.'; return; }
        const title = document.createElement('h3');
        title.textContent = `Hội thoại ${chat.id.slice(0, 8)} · Hết hạn ${date(chat.expires_at)}`;
        detail.append(title);
        if (!messages?.length) { detail.append('Hội thoại đã hết hạn hoặc không còn dữ liệu.'); return; }
        for (const message of messages) {
          const item = document.createElement('p');
          const label = document.createElement('strong');
          label.textContent = `${message.sender === 'user' ? 'Khách' : 'Chatbot'} · ${date(message.created_at)}\n`;
          item.append(label, document.createTextNode(message.content));
          detail.append(item);
        }
      });
      list.append(button);
    }
    if (data?.length) cursor = data[data.length - 1].created_at;
    more.hidden = !data || data.length < 50; more.disabled = false;
    status.textContent = list.childElementCount ? `${list.childElementCount} hội thoại. Chọn một hội thoại để xem.` : 'Chưa có cuộc chat mới được lưu.';
  };
  document.getElementById('admin-chat-refresh').addEventListener('click', () => window.loadAdminChats());
  more.addEventListener('click', () => window.loadAdminChats(true));
})();

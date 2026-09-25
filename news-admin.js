const newsAdminForm = document.getElementById("news-admin-form");
const newsAdminList = document.getElementById("news-admin-list");
const newsAdminMessage = document.getElementById("news-admin-message");
const newsExistingImages = document.getElementById("news-existing-images");
const newsStorage = supabaseClient.storage.from("news-images");
const newsAllowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);
let newsAdminRows = [];

function newsSlug(value) {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function newsAdminImageUrl(path) {
  return newsStorage.getPublicUrl(path).data.publicUrl;
}

function showExistingNewsImages(paths = []) {
  newsExistingImages.replaceChildren();
  paths.forEach((path, index) => {
    const label = document.createElement("label");
    const image = document.createElement("img");
    image.src = newsAdminImageUrl(path);
    image.alt = `Ảnh ${index + 1}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = path;
    const caption = document.createElement("span");
    caption.textContent = `Bỏ ảnh ${index + 1}`;
    label.append(image, checkbox, caption);
    newsExistingImages.append(label);
  });
}

function resetNewsForm() {
  newsAdminForm.reset();
  document.getElementById("news-edit-id").value = "";
  newsExistingImages.replaceChildren();
  document.getElementById("news-save-button").textContent = "Lưu bài viết";
}

function editNewsArticle(article) {
  document.getElementById("news-edit-id").value = article.id;
  document.getElementById("news-title").value = article.title;
  document.getElementById("news-slug").value = article.slug;
  document.getElementById("news-status").value = article.status;
  document.getElementById("news-excerpt").value = article.excerpt || "";
  document.getElementById("news-body").value = article.body;
  document.getElementById("news-images").value = "";
  showExistingNewsImages(article.image_paths || []);
  document.getElementById("news-save-button").textContent = "Cập nhật bài viết";
  newsAdminForm.scrollIntoView({ behavior: "smooth" });
}

function renderNewsAdminList() {
  newsAdminList.replaceChildren();
  if (!newsAdminRows.length) {
    newsAdminList.textContent = "Chưa có bài viết. Hãy tạo bài đầu tiên ở trên.";
    return;
  }
  newsAdminRows.forEach((article) => {
    const row = document.createElement("div");
    row.className = "news-admin-item";
    if (article.image_paths?.length) {
      const image = document.createElement("img");
      image.src = newsAdminImageUrl(article.image_paths[0]);
      image.alt = "";
      image.loading = "lazy";
      row.append(image);
    }
    const info = document.createElement("div");
    info.className = "news-admin-item-info";
    const title = document.createElement("strong");
    title.textContent = article.title;
    const details = document.createElement("small");
    details.textContent = `${article.status === "published" ? "Đã đăng" : "Bản nháp"} · ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(article.published_at || article.created_at))}`;
    info.append(title, details);
    row.append(info);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Sửa";
    edit.addEventListener("click", () => editNewsArticle(article));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Xóa";
    remove.addEventListener("click", () => void deleteNewsArticle(article));
    row.append(edit, remove);
    newsAdminList.append(row);
  });
}

window.loadNewsAdmin = async function loadNewsAdmin() {
  const { data, error } = await supabaseClient.from("news_articles")
    .select("id,slug,title,excerpt,body,image_paths,status,published_at,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    newsAdminMessage.textContent = error.code === "42P01" || error.code === "PGRST205"
      ? "Chưa tạo bảng tin tức. Chạy supabase/setup-news.sql trong Supabase SQL Editor."
      : `Chưa tải được tin tức: ${error.message}`;
    return;
  }
  newsAdminMessage.textContent = "";
  newsAdminRows = data || [];
  renderNewsAdminList();
};

async function deleteNewsArticle(article) {
  if (!window.confirm(`Xóa bài “${article.title}” và các ảnh của bài này?`)) return;
  const { error } = await supabaseClient.from("news_articles").delete().eq("id", article.id);
  if (error) {
    newsAdminMessage.textContent = `Không thể xóa bài: ${error.message}`;
    return;
  }
  const paths = article.image_paths || [];
  const cleanup = paths.length ? await newsStorage.remove(paths) : { error: null };
  resetNewsForm();
  await window.loadNewsAdmin();
  newsAdminMessage.textContent = cleanup.error
    ? "Đã xóa bài; không xóa được một số ảnh khỏi kho lưu trữ."
    : "Đã xóa bài viết và ảnh.";
}

document.getElementById("news-reset-button").addEventListener("click", resetNewsForm);

newsAdminForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const saveButton = document.getElementById("news-save-button");
  const editId = document.getElementById("news-edit-id").value;
  const previous = newsAdminRows.find((article) => article.id === editId);
  const title = document.getElementById("news-title").value.trim();
  const slugInput = document.getElementById("news-slug").value.trim();
  const slug = slugInput || newsSlug(title);
  const body = document.getElementById("news-body").value.trim();
  const status = document.getElementById("news-status").value;
  const images = Array.from(document.getElementById("news-images").files || []);
  const removed = new Set(Array.from(newsExistingImages.querySelectorAll("input:checked"), (box) => box.value));
  const kept = (previous?.image_paths || []).filter((path) => !removed.has(path));
  const uploaded = [];

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    newsAdminMessage.textContent = "Đường dẫn không hợp lệ. Chỉ dùng chữ thường không dấu và dấu gạch ngang.";
    return;
  }
  if (kept.length + images.length > 8) {
    newsAdminMessage.textContent = "Mỗi bài tối đa 8 ảnh. Bỏ bớt ảnh cũ hoặc ảnh vừa chọn.";
    return;
  }
  for (const file of images) {
    if (!newsAllowedTypes.has(file.type) || file.size > 5 * 1024 * 1024) {
      newsAdminMessage.textContent = `Ảnh ${file.name} sai định dạng hoặc lớn hơn 5 MB.`;
      return;
    }
  }

  saveButton.disabled = true;
  newsAdminMessage.textContent = "Đang lưu bài và tải ảnh...";
  const id = editId || crypto.randomUUID();
  try {
    for (const file of images) {
      const extension = newsAllowedTypes.get(file.type);
      const path = `articles/${id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await newsStorage.upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      uploaded.push(path);
    }
    const article = {
      id, slug, title,
      excerpt: document.getElementById("news-excerpt").value.trim(),
      body,
      image_paths: [...kept, ...uploaded],
      status,
      published_at: status === "published"
        ? previous?.published_at || new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (!previous) article.created_by = (await supabaseClient.auth.getUser()).data.user?.id;
    const result = previous
      ? await supabaseClient.from("news_articles").update(article).eq("id", id)
      : await supabaseClient.from("news_articles").insert(article);
    if (result.error) throw result.error;

    const cleanup = removed.size ? await newsStorage.remove([...removed]) : { error: null };
    resetNewsForm();
    await window.loadNewsAdmin();
    newsAdminMessage.textContent = cleanup.error
      ? "Đã lưu bài, nhưng không xóa được một số ảnh cũ."
      : status === "published" ? "Đã đăng bài lên trang Tin tức." : "Đã lưu bản nháp.";
  } catch (error) {
    if (uploaded.length) await newsStorage.remove(uploaded);
    newsAdminMessage.textContent = error.code === "23505"
      ? "Đường dẫn bài viết đã tồn tại. Hãy chọn đường dẫn khác."
      : `Không thể lưu bài: ${error.message || "Vui lòng thử lại."}`;
  } finally {
    saveButton.disabled = false;
  }
});

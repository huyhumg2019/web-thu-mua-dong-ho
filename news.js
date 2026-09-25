const newsClient = typeof supabasePublicClient === "undefined"
  ? supabase.createClient(
      window.REWATCH_SUPABASE.url,
      window.REWATCH_SUPABASE.publishableKey,
    )
  : supabasePublicClient;

const newsBucket = newsClient.storage.from("news-images");
const newsDateFormatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" });

function newsImageUrl(path) {
  return newsBucket.getPublicUrl(path).data.publicUrl;
}

function makeNewsCard(article) {
  const card = document.createElement("a");
  card.className = "news-card";
  card.href = `news.html?slug=${encodeURIComponent(article.slug)}`;

  if (article.image_paths?.length) {
    const image = document.createElement("img");
    image.className = "news-card-image";
    image.src = newsImageUrl(article.image_paths[0]);
    image.alt = article.title;
    image.loading = "lazy";
    card.append(image);
  } else {
    const placeholder = document.createElement("span");
    placeholder.className = "news-card-image-placeholder";
    placeholder.textContent = "LUXTIME";
    card.append(placeholder);
  }

  const copy = document.createElement("div");
  copy.className = "news-card-copy";
  const date = document.createElement("time");
  date.dateTime = article.published_at;
  date.textContent = newsDateFormatter.format(new Date(article.published_at));
  const title = document.createElement("h3");
  title.textContent = article.title;
  const excerpt = document.createElement("p");
  excerpt.textContent = article.excerpt || article.body.slice(0, 130);
  copy.append(date, title, excerpt);
  card.append(copy);
  return card;
}

async function loadNewsCards(container, { start = 0, count = 12 } = {}) {
  const { data, error } = await newsClient
    .from("news_articles")
    .select("slug,title,excerpt,body,image_paths,published_at")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .range(start, start + count - 1);

  if (error) throw error;
  (data || []).forEach((article) => container.append(makeNewsCard(article)));
  return data?.length || 0;
}

async function loadArticle(slug) {
  const articleArea = document.getElementById("news-article");
  const listArea = document.getElementById("news-index");
  articleArea.hidden = false;
  listArea.hidden = true;
  const message = document.getElementById("news-article-message");

  const { data: article, error } = await newsClient
    .from("news_articles")
    .select("title,excerpt,body,image_paths,published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();

  if (error || !article) {
    message.textContent = error
      ? "Chưa tải được bài viết. Vui lòng thử lại."
      : "Không tìm thấy bài viết này.";
    return;
  }

  document.title = `${article.title} — LUXTIME`;
  document.getElementById("news-article-title").textContent = article.title;
  const date = document.getElementById("news-article-date");
  date.dateTime = article.published_at;
  date.textContent = newsDateFormatter.format(new Date(article.published_at));
  document.getElementById("news-article-excerpt").textContent = article.excerpt;
  document.getElementById("news-article-body").textContent = article.body;

  const images = document.getElementById("news-article-images");
  (article.image_paths || []).forEach((path, index) => {
    const image = document.createElement("img");
    image.src = newsImageUrl(path);
    image.alt = `${article.title} — ảnh ${index + 1}`;
    image.loading = index ? "lazy" : "eager";
    images.append(image);
  });
}

async function startNews() {
  const homeList = document.getElementById("home-news-list");
  if (homeList) {
    try {
      const count = await loadNewsCards(homeList, { count: 3 });
      if (!count) document.querySelector(".news-preview-section").hidden = true;
    } catch (error) {
      console.error("News preview:", error);
      document.querySelector(".news-preview-section").hidden = true;
    }
    return;
  }

  const list = document.getElementById("news-list");
  if (!list) return;

  document.querySelector(".menu")?.addEventListener("click", (event) => {
    const open = document.body.classList.toggle("menu-open");
    event.currentTarget.setAttribute("aria-expanded", String(open));
  });

  const slug = new URLSearchParams(location.search).get("slug");
  if (slug) {
    await loadArticle(slug);
    return;
  }

  let offset = 0;
  const loadMore = document.getElementById("news-load-more");
  const message = document.getElementById("news-list-message");
  async function nextPage() {
    loadMore.disabled = true;
    try {
      const count = await loadNewsCards(list, { start: offset, count: 12 });
      offset += count;
      loadMore.hidden = count < 12;
      message.textContent = offset ? "" : "Chưa có bài viết nào được đăng.";
    } catch (error) {
      console.error("News list:", error);
      message.textContent = "Chưa tải được tin tức. Vui lòng thử lại.";
    } finally {
      loadMore.disabled = false;
    }
  }
  loadMore.addEventListener("click", nextPage);
  await nextPage();
}

void startNews();

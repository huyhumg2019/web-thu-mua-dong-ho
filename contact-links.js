// Điền đường dẫn tài khoản LUXTIME đã xác nhận trước khi xuất bản.
const LUXTIME_CONTACT_LINKS = Object.freeze({
  zalo: "",
  instagram: "",
  facebook: "",
});

document.querySelectorAll("a[data-contact]").forEach((link) => {
  const raw = LUXTIME_CONTACT_LINKS[link.dataset.contact];
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") throw new Error("Use HTTPS");
    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.removeAttribute("aria-disabled");
  } catch {
    link.removeAttribute("href");
    link.setAttribute("aria-disabled", "true");
  }
});

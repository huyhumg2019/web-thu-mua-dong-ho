// Chỉ hiển thị những kênh LUXTIME đã có tài khoản.
const LUXTIME_CONTACT_LINKS = Object.freeze({
  zalo: "",
  instagram: "",
  facebook: "https://www.facebook.com/profile.php?id=61594430955885&locale=vi_VN",
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
    link.remove();
  }
});

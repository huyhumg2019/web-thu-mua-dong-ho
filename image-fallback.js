const REWATCH_IMAGE_FALLBACK =
  "images/watch-placeholder.svg";

document.addEventListener(
  "error",
  (event) => {
    const image = event.target;

    if (
      !(image instanceof HTMLImageElement) ||
      image.dataset.fallbackApplied === "true"
    ) {
      return;
    }

    image.dataset.fallbackApplied = "true";
    image.src = REWATCH_IMAGE_FALLBACK;
    image.alt =
      image.alt || "Ảnh đồng hồ đang được cập nhật";
  },
  true,
);

// Shared sync policy for Kame, Watchnian and future price sources.
export function isManagedVariant(variant) {
  return Boolean(variant && (!variant.active || variant.price_mode === "manual"));
}

export function isManualReference(reference) {
  return Boolean(reference?.price_mode === "manual" &&
    reference.price_source === "manual");
}

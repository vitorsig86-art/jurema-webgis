export const MOBILE_QUERY = "(pointer: coarse) and (max-width: 760px)";

// Fixed at App initialization so resizing cannot restart layer loading.
export function isMobileClient(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia(MOBILE_QUERY).matches;
}

/**
 * Project routes are added here after application discovery.
 *
 * Verified against the live Automation Exercise site (2026-08-13):
 * unauthenticated GET /products returns 200 with the All Products listing.
 */
export const ROUTES = Object.freeze({
  HOME: "/",
  PRODUCTS: "/products",
});

export function getFullUrl(route) {
  const baseUrl = Cypress.config("baseUrl");
  if (!baseUrl) {
    throw new Error("Set baseUrl before resolving application routes.");
  }
  return `${baseUrl.replace(/\/$/, "")}/${String(route).replace(/^\//, "")}`;
}

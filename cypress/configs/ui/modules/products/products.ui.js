/**
 * UI contract for the Automation Exercise products listing.
 *
 * Verified against the live site on 2026-08-13 via an unauthenticated GET of /products:
 * the listing renders as a card grid (`.features_items`) of `.product-image-wrapper`
 * cards, each exposing a product name in a `<p>` inside `.productinfo`.
 *
 * The application ships no `data-*` test attributes, so these structural CSS hooks
 * (locator contract level 5) are centralized here. Visible text is preferred for the
 * heading where a stable semantic value exists.
 */
export const PRODUCTS_UI = Object.freeze({
  listingGrid: ".features_items",
  productCard: ".product-image-wrapper",
  productName: ".productinfo p",
  headingText: "All Products",
});

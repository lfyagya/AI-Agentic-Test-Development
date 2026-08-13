// Generated example e2e spec on 2026-08-13.
// @no-ensureAuthenticated — the product search API is public; no session is required to query it.
//
// Tier boundary demonstrated here: this is a POST, so it lives in the e2e tier. The smoke-read-only
// rule blocks POST/PUT/PATCH/DELETE in smoke specs; the e2e tier allows them. The search itself is a
// read-only query and mutates no shared state, which is why it is safe against the public site.

describe("products · e2e", () => {
  it(
    "[AE-PRODUCTS-003] product search API returns matching products for a search term",
    { tags: ["@AE-PRODUCTS-003", "@e2e", "@regression", "@P1"] },
    () => {
      cy.step("Search the public product catalog for a term");
      cy.searchProductCatalog("top").then((response) => {
        const body =
          typeof response.body === "string"
            ? JSON.parse(response.body)
            : response.body;

        cy.step("Assert the search returns a well-formed, non-empty product list");
        expect(response.status, "transport status").to.eq(200);
        expect(body.responseCode, "payload responseCode").to.eq(200);
        expect(body.products, "products array").to.be.an("array").and.not.be
          .empty;

        body.products.forEach((product, index) => {
          expect(product, `product ${index + 1} shape`).to.include.keys(
            "id",
            "name",
            "price",
          );
        });
      });
    },
  );
});

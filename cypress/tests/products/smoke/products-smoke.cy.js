// @no-ensureAuthenticated — the product catalog is public; no session is required to read it.

describe("products · smoke", () => {
  it(
    "[AE-PRODUCTS-001] product catalog API returns a non-empty, well-formed product list",
    { tags: ["@AE-PRODUCTS-001", "@SMOKE", "@P0", "@smoke"] },
    () => {
      cy.step("Request the public product catalog");
      cy.requestProductCatalog().then((response) => {
        const body =
          typeof response.body === "string"
            ? JSON.parse(response.body)
            : response.body;

        cy.step("Assert the catalog is served and well-formed");
        expect(response.status, "transport status").to.eq(200);
        expect(body.responseCode, "payload responseCode").to.eq(200);
        expect(body.products, "products array").to.be.an("array").and.not.be
          .empty;

        const [firstProduct] = body.products;
        expect(firstProduct, "first product shape").to.include.keys(
          "id",
          "name",
          "price",
        );
      });
    },
  );
});

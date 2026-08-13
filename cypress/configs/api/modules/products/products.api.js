/**
 * @fileoverview Products module — API contract.
 *
 * `LIST` is the documented Automation Exercise catalog API
 * (https://automationexercise.com/api_list, "API 1: Get All Products List"), verified live
 * 2026-08-13. It is read-only and safe for the smoke tier. The absolute URL is intentional: the
 * catalog smoke calls the API directly with cy.apiRequest and does not depend on a configured
 * baseUrl.
 */
export const PRODUCTS_API = Object.freeze({
  LIST: Object.freeze({
    method: "GET",
    endpoint: "https://automationexercise.com/api/productsList",
    alias: "productsList",
    expectedStatus: 200,
  }),
});

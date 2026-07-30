/**
 * Project routes are added here after application discovery.
 */
export const ROUTES = Object.freeze({});

export function getFullUrl(route) {
  const baseUrl = Cypress.config("baseUrl");
  if (!baseUrl) {
    throw new Error("Set baseUrl before resolving application routes.");
  }
  return `${baseUrl.replace(/\/$/, "")}/${String(route).replace(/^\//, "")}`;
}

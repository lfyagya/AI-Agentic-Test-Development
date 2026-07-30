const { defineConfig } = require("cypress");
const fs = require("node:fs");
const path = require("node:path");
const { plugin: cypressGrepPlugin } = require("@cypress/grep/plugin");
const webpackPreprocessor = require("@cypress/webpack-preprocessor");
const webpackConfig = require("./cypress/webpack.config.js");

/**
 * Load environment-specific config from cypress/environments/cypress.env.{env}.json
 * Usage: cypress run --env configFile=qa
 */
function loadEnvConfig(configFile) {
  if (!configFile) return {};
  const filePath = path.resolve(
    __dirname,
    "cypress",
    "environments",
    `cypress.env.${configFile}.json`,
  );
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠ Environment config not found: ${filePath}`);
    return {};
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

module.exports = defineConfig({
  // ── Global Config ──
  allowCypressEnv: false,
  chromeWebSecurity: false,
  video: false,
  screenshotOnRunFailure: true,
  viewportWidth: 1920,
  viewportHeight: 1080,

  // ── Memory Management ──
  numTestsKeptInMemory: 5,

  // ── Timeouts ──
  defaultCommandTimeout: 10000,
  requestTimeout: 15000,
  responseTimeout: 15000,
  pageLoadTimeout: 30000,

  // ── Reporter ──
  // saveJson writes cypress/reports/html/index.json alongside the HTML. The HTML is for
  // humans; the JSON is the machine-readable run record that evidence and metrics are
  // computed from. Without it there is no input to normalize and coverage cannot be
  // measured. Passed through to mochawesome-report-generator, no extra dependency.
  reporter: "cypress-mochawesome-reporter",
  reporterOptions: {
    charts: true,
    reportPageTitle: "Automation Test Report",
    embeddedScreenshots: true,
    inlineAssets: true,
    saveAllAttempts: false,
    saveJson: true,
    reportDir: "cypress/reports/html",
  },

  e2e: {
    specPattern: "cypress/tests/**/*.cy.js",
    supportFile: "cypress/support/e2e.js",
    fixturesFolder: "cypress/fixtures",
    downloadsFolder: "cypress/downloads",
    screenshotsFolder: "cypress/screenshots",
    videosFolder: "cypress/videos",

    setupNodeEvents(on, config) {
      // ── Mochawesome reporter ──
      require("cypress-mochawesome-reporter/plugin")(on);

      // ── Cypress Grep plugin ──
      cypressGrepPlugin(config);

      // ── Webpack preprocessor (path aliases) ──
      on(
        "file:preprocessor",
        webpackPreprocessor({ webpackOptions: webpackConfig }),
      );

      // ── Debug task ──
      on("task", {
        log(message) {
          console.log(message);
          return null;
        },
      });

      // ── Environment config merge ──
      const envConfig = loadEnvConfig(config.env.configFile);
      config.env = { ...config.env, ...envConfig };

      // ── Base URL from env ──
      if (config.env.baseUrl && !config.baseUrl) {
        config.baseUrl = config.env.baseUrl;
      }

      return config;
    },
  },
});

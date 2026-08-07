/**
 * @fileoverview Webpack Configuration for Cypress
 *
 * Enables path aliases so imports stay clean:
 *   @configs/*  → cypress/configs/*
 *   @support/*  → cypress/support/*
 *   @fixtures/* → cypress/fixtures/*
 */
const path = require("node:path");

module.exports = {
  resolve: {
    alias: {
      "@configs": path.resolve(__dirname, "configs"),
      "@support": path.resolve(__dirname, "support"),
      "@tests": path.resolve(__dirname, "tests"),
      "@fixtures": path.resolve(__dirname, "fixtures"),
      "@core": path.resolve(__dirname, "support/core"),
    },
    // .ts must be resolvable, and must come before .js so a module with both prefers the typed one.
    extensions: [".ts", ".js", ".jsx", ".json"],
  },
  module: {
    rules: [
      {
        // TypeScript is opt-in per file: this rule compiles .js and .ts through the same loader, so
        // a repo can hold both without converting anything. preset-typescript strips types without
        // checking them — `npm run typecheck` is what verifies them.
        test: /\.[jt]s$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-typescript"],
          },
        },
      },
      {
        test: /\.m?js/,
        resolve: { fullySpecified: false },
      },
    ],
  },
};

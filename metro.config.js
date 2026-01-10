// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// Get the project root
const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Add path aliases
config.resolver.alias = { "@": path.resolve(projectRoot) };
// 2. Enable NativeWind
module.exports = withNativeWind(config, {
  // 3. Set `input` to your global CSS file
  input: "./app/globals.css",
  // 4. Set `output` to a path that is watched by Metro
  output: "nativewind-output.js",
});

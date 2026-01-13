const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Fix Windows ESM path resolution
config.resolver.unstable_enablePackageExports = true;

module.exports = config;

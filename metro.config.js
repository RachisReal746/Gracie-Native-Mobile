const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');

// create a minimal empty module for crypto
const emptyModulePath = path.resolve(__dirname, 'empty.js');

const config = getDefaultConfig(__dirname);

// alias certain modules to appropriate implementations
config.resolver.extraNodeModules = {
  crypto: emptyModulePath,
};

// force axios to use the browser build
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
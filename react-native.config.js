module.exports = {
  reactNativePath: './node_modules/react-native',
  project: {
    android: {
      packageName: 'com.anchoredbygrace.gracie',
    },
    ios: {},
  },
  commands: [],
  dependencies: {},
  assets: [],
  // Enable new architecture (Fabric/TurboModules)
  experimental: {
    newArchEnabled: true,
    enableFabric: true,
    enableTurboModules: true,
  },
};

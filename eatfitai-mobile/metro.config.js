const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Zustand's ESM export currently leaves import.meta.env in the Metro web bundle.
// Resolve package mains instead so Expo web preview can run as a classic script.
config.resolver.unstable_enablePackageExports = false;

config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'glb',
  'gltf',
  'bin',
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  zustand: path.resolve(__dirname, 'node_modules/zustand/index.js'),
  'zustand/vanilla': path.resolve(__dirname, 'node_modules/zustand/vanilla.js'),
};

module.exports = config;

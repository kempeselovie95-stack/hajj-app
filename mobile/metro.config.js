const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const rootNodeModules = path.resolve(__dirname, '../node_modules');

config.watchFolders = [
  path.resolve(__dirname, '../shared'),
  path.resolve(__dirname, '../shared/src'),
];

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
    rootNodeModules,
  ],
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    '@hajj/shared': path.resolve(__dirname, '../shared/src'),
  },
};

module.exports = config;

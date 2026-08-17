const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  path.resolve(__dirname, '../shared'),
  path.resolve(__dirname, '../shared/src'),
];

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    '@hajj/shared': path.resolve(__dirname, '../shared/src'),
  },
};

module.exports = config;

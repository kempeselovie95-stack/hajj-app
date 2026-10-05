const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const mobileNodeModules = path.resolve(__dirname, 'node_modules');
const rootNodeModules = path.resolve(__dirname, '../node_modules');

config.watchFolders = [
  path.resolve(__dirname, '../shared'),
  path.resolve(__dirname, '../shared/src'),
  rootNodeModules,
];

// Le workspace web utilise React 18 (hissé à la racine) alors que le mobile
// exige React 19 / RN 0.81 (dans mobile/node_modules). On force ces paquets
// à se résoudre depuis mobile/node_modules pour n'avoir qu'une seule copie
// dans le bundle, sans casser les dépendances imbriquées des autres paquets.
const PINNED = ['react', 'react-dom', 'react-native'];

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [mobileNodeModules, rootNodeModules],
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    '@hajj/shared': path.resolve(__dirname, '../shared/src'),
  },
  resolveRequest: (context, moduleName, platform) => {
    const pinned = PINNED.some((p) => moduleName === p || moduleName.startsWith(p + '/'));
    const ctx = pinned
      ? { ...context, originModulePath: path.join(__dirname, 'App.js') }
      : context;
    return ctx.resolveRequest(ctx, moduleName, platform);
  },
};

module.exports = config;

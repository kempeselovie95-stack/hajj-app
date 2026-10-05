/**
 * Lance la CLI Expo en rendant visibles les paquets Metro installés dans mobile/node_modules.
 *
 * Le workspace web force React 18 à la racine, alors que le mobile exige React 19 / Metro :
 * ces paquets vivent donc dans mobile/node_modules, où la CLI (installée à la racine)
 * ne les trouve pas ("Cannot find module 'metro-runtime/package.json'").
 * NODE_PATH règle cela sans toucher à l'arborescence de dépendances.
 */
const { spawn } = require('child_process');
const path = require('path');

const mobileModules = path.resolve(__dirname, '../node_modules');
const rootModules = path.resolve(__dirname, '../../node_modules');
const expoCli = require.resolve('expo/bin/cli', { paths: [path.resolve(__dirname, '..'), rootModules] });

const child = spawn(process.execPath, [expoCli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: [mobileModules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter) },
});
child.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 0));

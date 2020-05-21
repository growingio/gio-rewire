const fs = require('fs');
const { getProjectPath } = require('./utils/projectHelper');
const { assign } = require('lodash')

module.exports = function () {
  let custom = {};
  const tsconfigPath = getProjectPath('tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    custom = require(tsconfigPath);
  }
  return assign({
    noUnusedParameters: true,
    noUnusedLocals: true,
    strictNullChecks: true,
    target: 'es6',
    jsx: 'preserve',
    moduleResolution: 'node',
    declaration: true,
    allowSyntheticDefaultImports: true,
  }, custom.compilerOptions)

};

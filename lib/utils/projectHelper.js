"use strict";
const fs = require('fs');
const path = require('path');
const cwd = process.cwd();

function getProjectPath(...filePath) {
    return path.join(cwd, ...filePath);
}

function resolve(moduleName) {
  return require.resolve(moduleName);
}

function getConfig() {
  const configPath = getProjectPath('.gio-rewired.config.js');
  if (fs.existsSync(configPath)) {
    return require(configPath);
  }

  return {};
}

module.exports = {
  getProjectPath,
  resolve,
  getConfig,
  cwd
};

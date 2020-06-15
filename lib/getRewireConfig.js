const path = require('path')
const { getProjectPath, resolve } = require('./utils/projectHelper');
const defaultConfig = require(path.join(__dirname, '../.gio-rewire.config.js'))
const fs = require('fs');
const { merge} = require('lodash')

const customConfig = getProjectPath('.gio-rewire.js');

if (fs.existsSync(customConfig)) {
  module.exports = merge(defaultConfig, require(customConfig));
} else {
  module.exports = defaultConfig;
}



"use strict";

const through2 = require('through2');
const gulp = require('gulp');
const fs = require('fs');
const path = require('path');
const { getProjectPath, cwd } = require('./utils/projectHelper'); // eslint-disable-line import/order
const pkgConfig = require(getProjectPath('package.json'));
const rewireConfig = require('./getRewireConfig');
const merge2 = require('merge2');
const less = require('less');
const { readFileSync } = require('fs');
const postcss = require('postcss');
const NpmImportPlugin = require('less-plugin-npm-import');
const chalk = require('chalk');
const fse = require('fs-extra');
const esDir = getProjectPath('es');
const Vinyl = require('vinyl');
const distDir = getProjectPath('dist');
const mergeStylePath = getProjectPath(`${rewireConfig.projectName || '.temp'}.less`)

const autoprefixer = require('autoprefixer');
const { Stream } = require('stream');

const postcssConfig = {
  plugins: [autoprefixer()],
};

// 粗糙的将所有less 引用 捆绑在一起
const roughMergedLessContents = ['/** injected less */'];

function transformLess(lessFile, config = {}) {
  const { cwd = process.cwd() } = config;
  const resolvedLessFile = path.resolve(cwd, lessFile);

  let data = readFileSync(resolvedLessFile, 'utf-8');
  data = data.replace(/^\uFEFF/, '');

  // Do less compile
  const lessOpts = {
    paths: [path.dirname(resolvedLessFile)],
    filename: resolvedLessFile,
    plugins: [new NpmImportPlugin({ prefix: '~' })],
    javascriptEnabled: true,
  };
  return less
    .render(data, lessOpts)
    .then(result => postcss(postcssConfig.plugins).process(result.css, { from: undefined }))
    .then(r => r.css);
}


function transformLessFromContent(fileContent, config = {}) {
  fileContent = fileContent.replace(/^\uFEFF/, '');

  // Do less compile
  const lessOpts = {
    plugins: [new NpmImportPlugin({ prefix: '~' })],
    javascriptEnabled: true,
  };
  return less
    .render(fileContent, lessOpts)
    .then(result => postcss(postcssConfig.plugins).process(result.css, { from: undefined }))
    .then(r => r.css);
}



/**
 * 
 * @param {*} inputStream 
 * @param {*} watch 是否在 watch 模式
 */
function compileLess(inputStream, watch = false) {
  const lessParseStream = through2.obj(function (file, encoding, next) {
    const filePath = file.path.replace(cwd, '');
    console.log(chalk.green('compiling ' + filePath));
    this.push(file.clone());
    transformLess(file.path)
      .then(css => {
        file.contents = Buffer.from(css);
        file.path = file.path.replace(/\.less$/, '.css');
        this.push(file);
        console.log(chalk.green('compiled ' + filePath));
        next();
      })
      .catch(next);
  });

  const lessMergeStream = through2.obj(function (file, encoding, next) {
    try {
      roughMergedLessContents.push(`@import '${file.path}';`);
    } finally {
      next();
    }
  });

  const mergedStream = merge2(
    inputStream.pipe(lessParseStream)
      .pipe(gulp.dest(file => {
        return file.path.replace(file.path, getProjectPath('es'));
      }))
      .pipe(through2.obj(function (_0, _1, next) { next() })),
    inputStream.pipe(lessMergeStream)
  );

  mergedStream.on('finish', () => {
    transformLessFromContent(roughMergedLessContents.join('\n'))
      .then(transformedCss => {
        fse.outputFileSync(
          getProjectPath(`dist/${rewireConfig.projectName || 'rough-composed'}.css`), 
          transformedCss, 
          { encoding:'utf8', flag: 'w' }
        )
      }).catch(error => {
        console.log(error, roughMergedLessContents.join('\n'))
      })
  })

  return mergedStream;
}

function clearTempFile() {
  return through2.obj(function(_0, _1, next) {
    try {
      fs.unlinkSync(mergeStylePath); 
    } finally {
      next();
    }
  })
}

module.exports = compileLess;

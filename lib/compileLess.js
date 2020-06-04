"use strict";

const through2 = require('through2');
const gulp = require('gulp');
const fs = require('fs');
const path = require('path');
const { getProjectPath, cwd } = require('./utils/projectHelper'); // eslint-disable-line import/order
const pkgConfig = require(getProjectPath('package.json'));
const merge2 = require('merge2');
const less = require('less');
const { readFileSync } = require('fs');
const postcss = require('postcss');
// const rucksack = require('rucksack-css');
const NpmImportPlugin = require('less-plugin-npm-import');

const esDir = getProjectPath('es');
const distDir = getProjectPath('dist');
const mergeStylePath = getProjectPath(`.temp.less`)

const autoprefixer = require('autoprefixer');
const postcssConfig = {
  plugins: [autoprefixer()],
};

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

function compileLess(inputStream) {
  if (fs.existsSync(mergeStylePath))
    fs.unlinkSync(mergeStylePath)

  fs.writeFileSync(mergeStylePath, '')

  const lessParseStream = through2.obj(function (file, encoding, next) {
    console.log('compiling ' + file.path.replace(cwd, ''));
    this.push(file.clone());
    transformLess(file.path)
      .then(css => {
        file.contents = Buffer.from(css);
        file.path = file.path.replace(/\.less$/, '.css');
        this.push(file);
        next();
      })
      .catch(e => {
        console.error(e);
        next();
      });
  });

  const lessMergeStream = through2.obj(function (file, encoding, next) {
    fs.appendFileSync(mergeStylePath, `@import '${file.path}';\n`);
    next();
  });

  return merge2(
    inputStream.pipe(lessParseStream)
      .pipe(gulp.dest(file => {
        return file.path.replace(file.path, getProjectPath('es'));
      }))
      .pipe(through2.obj(function (_0, _1, next) { next() })),
    inputStream.pipe(lessMergeStream),
    gulp.src(mergeStylePath)
  ).pipe(through2.obj(function (file, enc, next) {
    transformLess(file.path)
      .then(css => {
        file.contents = Buffer.from(css);
        file.path = file.path.replace(/\.less$/, '.css');
        this.push(file);
        next();
      })
      .catch(error => {
        next(error);
      })
  })).pipe(gulp.dest(distDir)).pipe(through2.obj(function (_0, _1, next) { fs.unlinkSync(mergeStylePath); next() }))
}

module.exports = compileLess;
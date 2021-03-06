"use strict";

const through2 = require('through2');
const merge2 = require('merge2');
const ts = require('gulp-typescript');
const babel = require('gulp-babel');
const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const tsConfig = require('./getTsConfig')();
const rewireConfig = require('./getRewireConfig');
const getBabelCommonConfig = require('./getBabelCommonConfig');
const { getProjectPath, cwd } = require('./utils/projectHelper');
const chalk = require('chalk');

const esDir = 'es/';

function cssInjection(content) {
  return content
    .replace(/\/style\/?'/g, "/style/css'")
    .replace(/\/style\/?"/g, '/style/css"')
    .replace(/\.less/g, '.css');
}

function babelify(js) {
  const babelConfig = getBabelCommonConfig();
  return js
    .pipe(sourcemaps.init())
    .pipe(babel(babelConfig))
    .pipe(
      through2.obj(function z(file, encoding, next) {
        this.push(file.clone());
        if (file.path.match(/(\/|\\)style(\/|\\)index\.js/)) {
          const content = file.contents.toString(encoding);
          file.contents = Buffer.from(cssInjection(content));
          file.path = file.path.replace(/index\.js/, 'css.js')
          this.push(file);
          next();
        } else {
          next();
        }
      })
    )
    .pipe(sourcemaps.write('.'))
}

const tsDefaultReporter = ts.reporter.defaultReporter();

function compileTs(inputStream) {
  const tsResult = inputStream.pipe(through2.obj(function (file, encoding, next) {
    console.log(chalk.green('compiling ' + file.path.replace(cwd, '')));
    this.push(file);
    next();
  })).pipe(ts(tsConfig
    , {
    error(e) {
      tsDefaultReporter.error(e);
    },
    finish: tsDefaultReporter.finish
  }
  ))

  // tsResult.on('error', (error)=>{
  //   console.log('erro')
  //   if (!rewireConfig.watch) {
  //     process.exit(1);
  //   }
  // });

  const ds = tsResult.dts.pipe(through2.obj(function (file, encoding, next) {
    /**
     * 如果 *.d.ts 文件中包含 import '*.less' | '*.css' 之类的样式文件需要去除
     * d.ts 只做类型声明
     */
    if (file.path.match(/d\.ts/)) {
      let content = file.contents.toString(encoding);
      content = content.replace(/import [\"|\'].*\.(less|css|scss)[\"|\'];?/g, '')
      file.contents = Buffer.from(content);
      this.push(file);
    } else {
      this.push(file.clone());
    }
    next();
  }));

  const tsFilesStream = babelify(tsResult.js);

  return merge2([
    ds.pipe(gulp.dest(esDir)),
    tsFilesStream.pipe(gulp.dest(esDir))
  ]);
}

module.exports = compileTs;


"use strict";

const through2 = require('through2');
const merge2 = require('merge2');
const path = require('path');
const ts = require('gulp-typescript');
const babel = require('gulp-babel');
const gulp = require('gulp');
const rim = require('rimraf');
const sourcemaps = require('gulp-sourcemaps');
const tsConfig = require('./getTSConfig')();
const getBabelCommonConfig = require('./getBabelCommonConfig');
const { getProjectPath, cwd } = require('./utils/projectHelper');

const esDir = 'es/';

function babelify(js) {
  const babelConfig = getBabelCommonConfig();
  return js
    .pipe(sourcemaps.init())
    .pipe(babel(babelConfig))
    .on('error', function (error) {
      // we have an error
      console.error(error)
      done(error);
    })
    .pipe(
      through2.obj(function z(file, encoding, next) {
        this.push(file.clone());
        next();
        // if (file.path.match(/(\/|\\)style(\/|\\)index\.js/)) {
        //   const content = file.contents.toString(encoding);
        //   if (content.indexOf("'react-native'") !== -1) {
        //     // actually in antd-mobile@2.0, this case will never run,
        //     // since we both split style/index.mative.js style/index.js
        //     // but let us keep this check at here
        //     // in case some of our developer made a file name mistake ==
        //     next();
        //     return;
        //   }

        //   file.contents = Buffer.from(cssInjection(content));
        //   file.path = file.path.replace(/index\.js/, 'css.js');
        //   this.push(file);
        //   next();
        // } else {
        //   next();
        // }
      })
    )
    .pipe(sourcemaps.write('.'))
}

const tsDefaultReporter = ts.reporter.defaultReporter();
function compileTs(inputStream) {

  let error = 0;
  const tsResult = inputStream.pipe(through2.obj(function (file, encoding, next) {
    console.log('compiling ' + file.path.replace(cwd, ''));
    // file.path = file.path.replace(cwd, '');
    this.push(file);
    next();
  }))
    .pipe(
      ts(tsConfig, {
        error(e) {
          console.log('error')
          tsDefaultReporter.error(e);
        },
        finish: tsDefaultReporter.finish
      })
    )

  function check() {
    if (error) {
      console.log('error')
      process.exit(1);
    }
  }

  tsResult.on('finish', check);
  tsResult.on('end', check);

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


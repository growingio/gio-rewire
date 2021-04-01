"use strict";

const merge2 = require('merge2');
const gulp = require('gulp');
const rim = require('rimraf')
const fs = require('fs');
const path = require('path');
const tsConfig = require('./getTsConfig')();
const rewireConfig = require('./getRewireConfig');
const getBabelCommonConfig = require('./getBabelCommonConfig');
const { getProjectPath, resolve, getConfig } = require('./utils/projectHelper'); // eslint-disable-line import/order
const cwd = process.cwd();
const compileTs = require('./compileTs');
const compileLess = require('./compileLess');
const plumber = require('gulp-plumber');
const { tree } = require('gulp');
const libDir = getProjectPath('lib');
const esDir = getProjectPath('es');
const distDir = getProjectPath('dist');
const chalk = require('chalk');

const tsSource = [
  'src/**/*.ts?(x)',
  'typings/**/*.d.ts',
  '!src/**/__test?(s)__/*.ts?(x)',
  '!src/**/*.stories.ts?(x)',
  '!src/**/?(*)docs/*.ts?(x)'
]

if (tsConfig.allowJs) {
  tsSource.unshift('src/**/*.jsx');
  tsSource.unshift('src/**/*.js');
}

function processError(error) {
  console.error(error);
  if (!rewireConfig.watch) {
    process.exit(1);
  }
}

process.on('uncaughtException', processError)

const styleSource = [
  'src/**/*.less',
  '!src/**/*.stories.less',
]

function usePlumber(input, options) {
  return gulp.src(input, options).pipe(plumber({
    errorHandler: processError
  }));
}

function compile2Lib(watch) {
  // 删除相关模流
  rim.sync(esDir);
  rim.sync(distDir);
  rim.sync(libDir);

  return merge2([
    compileTs(usePlumber(tsSource)),
    usePlumber(['src/**/*.@(png|svg)']).pipe(gulp.dest(esDir)),
    compileLess(usePlumber(styleSource), watch),
  ])
}

function libCompile(done, watch) {
  console.log('[Parallel] Compile to js...');
  return compile2Lib(watch).on('finish', done).on('error', function (error) {
    console.log('catch error')
    console.error(error)
  });
}

function watch() {
  libCompile(() => {
    console.log('Init Compile Done.');
    const watcher = gulp.watch([].concat(tsSource, styleSource), { ignoreInitial: true, delay: 100, pwd: true });
    function recompile(filePath) {
      const extname = path.extname(filePath);
      let stream 
      if (extname === '.js' || extname === '.ts' || extname === '.tsx') {
        const source = [filePath, 'typings/**/*.d.ts'];
        stream = compileTs(usePlumber(source, {
          cwd: process.cwd(),
          base: 'src'
        }));
      } else if (extname === '.less') {
        stream = compileLess(usePlumber(filePath, {
          cwd: process.cwd(),
          base: 'src'
        }))
      }

      if (stream) {
        stream.on('finish', () => {
          console.log(chalk.green('Compiled ' + filePath));
        })
      }
     
    }
    watcher.on('change', recompile);

    watcher.on('add', recompile);
  }, true);
}

gulp.task(
  'lib-compile-watch',
  gulp.series([watch])
);

gulp.task('lib-compile', done => {
  console.log('[Parallel] Compile to js...');
  return compile2Lib().on('finish', done).on('error', function (error) {
    console.error(error)
  })
});

Promise.ca

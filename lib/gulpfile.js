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
const libDir = getProjectPath('lib');
const esDir = getProjectPath('es');
const distDir = getProjectPath('dist');

const tsSource = [
  'src/**/*.tsx',
  'src/**/*.ts',
  'typings/**/*.d.ts',
  '!src/**/docs/*.tsx',
  '!src/**/*docs/*.ts'
]
if (tsConfig.allowJs) {
  tsSource.unshift('src/**/*.jsx');
  tsSource.unshift('src/**/*.js');
}

const styleSource = [
  'src/**/*.less'
]

function compile2Lib() {
  // 删除相关模流
  rim.sync(esDir);
  rim.sync(distDir);
  rim.sync(libDir);

  return merge2([
    compileTs(gulp.src(tsSource)),
    gulp.src(['src/**/*.@(png|svg)']).pipe(gulp.dest(esDir)),
    compileLess(gulp.src(styleSource)),
  ])
}

function libCompile(done) {
  console.log('[Parallel] Compile to js...');
  return compile2Lib().on('finish', done).on('error', function (error) {
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
        stream = compileTs(gulp.src(source, {
          cwd: process.cwd(),
          base: 'src'
        }));
      } else if (extname === '.less') {
        stream = compileLess(gulp.src(filePath, {
          cwd: process.cwd(),
          base: 'src'
        }))
      }

      if (stream) {
        stream.on('finish', () => {
          console.log('Compiled ' + filePath);
        }).on('error', function (error) {
          console.error(error);
        })
      }
     
    }
    watcher.on('change', recompile);

    watcher.on('add', recompile);
  });
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
})

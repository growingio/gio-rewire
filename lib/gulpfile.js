"use strict";

const merge2 = require('merge2');
const gulp = require('gulp');
const rim = require('rimraf')
const fs = require('fs');
const path = require('path');
const tsConfig = require('./getTSConfig')();
const rewireConfig = require('./getRewireConfig');
const getBabelCommonConfig = require('./getBabelCommonConfig');
const { getProjectPath, resolve, getConfig } = require('./utils/projectHelper'); // eslint-disable-line import/order
const cwd = process.cwd();
const pkgConfig = require(getProjectPath('package.json'));
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

gulp.task('lib-compile', done => {
  console.log('[Parallel] Compile to js...');
  return compile2Lib().on('finish', done).on('error', function (error) {
    console.log(error)
  })
})

function libCompile(done) {
  console.log('[Parallel] Compile to js...');
  return compile2Lib().on('finish', done).on('error', function (error) {
    console.log(error)
  });
}

function watch() {
  libCompile(() => {
    console.log('Init Compile Done.');
    const watcher = gulp.watch([].concat(tsSource, styleSource), { ignoreInitial: true, delay: 100, pwd: true });
    function recompile(filePath, stats) {
      const extname = path.extname(filePath);
      console.log('recompile ' + filePath);
      console.log(extname);
      if (extname === '.js' || extname === '.ts' || extname === '.tsx') {
        const source = [filePath, 'typings/**/*.d.ts'];
        compileTs(gulp.src(source)).on('finish', () => {
          console.log('Compiled ' + filePath)
        }).on('error', function (error) {
          console.error(error)
        })
      } else if (extname === '.less') {
        compileLess(gulp.src(filePath)).on('finish', () => {
          console.log('Compiled ' + filePath)
        }).on('error', function (error) {
          console.error(error)
        })
      }
     
    }
    watcher.on('change', recompile);

    watcher.on('add', recompile);


  })


}

gulp.task(
  'lib-compile-watch',
  gulp.series([watch])
);

// watch('src/*.css', css);
// Or a composed task
// watch('src/*.js', series(clean, javascript));

// gulp.task(name, deps, func) was replaced by gulp.task(name, gulp.{series|parallel}(deps, func))
// gulp.task('default', [ 'lib-compile']);
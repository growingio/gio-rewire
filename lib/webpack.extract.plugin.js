
function createLogHandler(filename) {
  const logPath = path.resolve(__dirname, filename);
  fs.removeSync(logPath);
  fs.ensureFileSync(logPath);
  function append(newContent) {
    if (newContent) {
      const content = fs.readFileSync(logPath);
      newContent = content + `\n${newContent}`;
      fs.outputFileSync(
        logPath,
        newContent
      );
    }
  }
  return append;
}

const append2ModifyLog = createLogHandler('modify.out');
function copyFile(from) {
  const resource = from.slice(__dirname.length + 1);
  const to = path.resolve(__dirname, 'dist', resource);
  if (!fs.existsSync(to)) {
    append2ModifyLog(`Copy ${from} to ${to}`);
    fs.copySync(from, to);
  }
}

function getFileDepsMap(compilation) {
  const fileDepsBy = [...compilation.fileDependencies].reduce(
    (acc, usedFilePath) => {
      acc[usedFilePath] = true;
      return acc;
    },
    {}
  );

  const { assets } = compilation;
  Object.keys(assets).forEach(assetRelpath => {
    const existsAt = assets[assetRelpath].existsAt;
    fileDepsBy[existsAt] = true;
  });
  return fileDepsBy;
}
function ExtractAppPlugin() { }
ExtractAppPlugin.prototype.apply = function apply(compiler) {
  compiler.hooks.emit.tapAsync('CopyPlugin', (compilation, callback) => {
    const fileDependencies = Object.keys(getFileDepsMap(compilation))
      .filter(file => file.indexOf && file.indexOf('node_modules') === -1);
    fileDependencies.forEach(copyFile);
    fs.copySync(path.resolve(__dirname, 'app', 'typings'), path.resolve(__dirname, 'dist', 'app/typings'));
    callback();
  });
};

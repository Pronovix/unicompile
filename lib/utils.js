const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const { join: pathJoin } = require('path');
const { promises: fsPromises } = require('fs');
const { yellow } = require('chalk');

module.exports.getSettings = (dirPath) => {
  const settingsPath = pathJoin(dirPath, '/.unicompilerc.json');
  return fsPromises
    .access(settingsPath)
    .then(() => {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const settings = require(settingsPath);
      if (settings.length === 0) {
        console.warn(`No settings provided in ${settingsPath} file.`);
        return false;
      }
      return settings;
    })
    .catch(() => {
      console.warn(yellow(`Unicompile settings not defined or not accessible at ${settingsPath}.`));
      return false;
    });
};

module.exports.report = (messages) => {
  return messages.map((message) => {
    return console.log(message);
  });
};

module.exports.removeDir = (dir) => {
  return new Promise((resolve, reject) => {
    rimraf(dir, (e) => {
      if (e) {
        return reject(e);
      }
      return resolve();
    });
  }).catch((e) => {
    throw e;
  });
};

module.exports.createDir = (dir) => {
  return new Promise((resolve, reject) => {
    mkdirp(dir, (e) => {
      if (e) {
        return reject(e);
      }
      return resolve();
    });
  }).catch((e) => {
    throw e;
  });
};

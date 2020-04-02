const rimraf = require('rimraf');
const { resolve: pathResolve, join: pathJoin } = require('path');
const { promises: fsPromises } = require('fs');
const { yellow } = require('chalk');

module.exports.getConfig = (dirPath) => {
  const configPath = pathJoin(pathResolve(dirPath), '.unicompilerc.json');
  return fsPromises
    .access(configPath)
    .then(() => {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const settings = require(configPath);
      if (settings.length === 0) {
        console.warn(`No settings provided in ${configPath} file.`);
        return false;
      }
      return settings;
    })
    .catch(() => {
      console.warn(yellow(`Unicompile settings not defined or not accessible at ${configPath}.`));
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

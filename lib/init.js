require('console-stamp')(console, {
  pattern: 'HH:MM:ss',
  colors: {
    label: 'gray',
  },
});
const { promises: fsPromises } = require('fs');
const { getSettingsPath } = require('./utils.js');

module.exports.command = 'init';
module.exports.describe = 'Create a .unicompilerc.json file.';
module.exports.handler = () => {
  const settingsPath = getSettingsPath();
  fsPromises
    .access(settingsPath)
    .then(() => {
      return console.log(`Config file already exists at: ${settingsPath}`);
    })
    .catch(() => {
      // eslint-disable-next-line promise/no-nesting
      fsPromises
        .writeFile(settingsPath, '[]')
        .then(() => {
          return console.log(`${settingsPath} created.`);
        })
        .catch((e) => {
          return console.error(e);
        });
    });
};

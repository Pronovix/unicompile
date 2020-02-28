require('console-stamp')(console, {
  pattern: 'HH:MM:ss',
  colors: {
    label: 'gray',
  },
});
const { yellow, cyan, green } = require('chalk');
const { watch: chokidarWatch } = require('chokidar');
const { join: pathJoin, resolve: pathResolve, dirname: pathDirname, basename: pathBasename } = require('path');
const { render: sassRender } = require('node-sass-promise');
const { promises: fsPromises } = require('fs');
const postcss = require('postcss');
const postcssCustomProperties = require('postcss-custom-properties');
const autoprefixer = require('autoprefixer');
const globPromise = require('glob-promise');
const exportSass = require('node-sass-export');
const { transformFileAsync: transform } = require('@babel/core');
const { getSettings, report, removeDir, createDir } = require('./utils');

let settingsPath = false;
let settings = false;

module.exports.command = 'build [path]';
module.exports.describe =
  'Build project Javascript and SCSS. An optional path can be given to use instead of the configuration file.';
module.exports.builder = {
  w: {
    type: 'boolean',
    default: false,
    describe: 'Watch a directory.',
    alias: ['watch'],
  },
  s: {
    type: 'boolean',
    default: false,
    describe: 'Emit source map.',
    alias: ['source-map'],
  },
  'output-style': {
    type: 'string',
    default: 'compressed',
    describe: 'CSS output style (nested | expanded | compact | compressed)',
  },
  develop: {
    type: 'boolean',
    default: false,
    describe:
      'Use development mode where source maps are generated and CSS is expanded. This is the equivalent of -s and --output-style="expanded" combined.',
  },
  sassIgnore: {
    type: 'array',
    default: [],
    describe: 'Give an array of glob patterns to globally ignore when compiling SASS files.',
  },
  jsIgnore: {
    type: 'array',
    default: [],
    describe: 'Give an array of glob patterns to globally ignore when compiling JS files.',
  },
};

const getAbsBuildPath = (cwd) => {
  return typeof settings === 'string' ? pathResolve(settingsPath) : pathResolve(pathJoin(settingsPath, cwd));
};

const buildSass = async (args, config) => {
  try {
    const localArgs = { ...args };
    if (localArgs.develop) {
      localArgs.s = true;
      localArgs['output-style'] = 'expanded';
    }
    const messages = [];
    const absCwd = getAbsBuildPath(config.cwd);
    const ignore = ['**/_*.scss'];
    if (config.sassIgnore) {
      ignore.push(...config.sassIgnore);
    }
    if (localArgs.sassIgnore.length > 0) {
      ignore.push(...localArgs.sassIgnore);
    }
    const sourceDir = pathJoin(absCwd, 'scss');
    const outDir = pathJoin(absCwd, 'dist/css');
    const files = await globPromise(pathJoin(sourceDir, '**/*.scss'), { ignore });
    if (files.length === 0) {
      return console.warn(`No '.scss' files found in ${sourceDir}`);
    }
    // Reset output.
    await removeDir(outDir);
    messages.push(yellow(`Directory ${pathResolve(outDir)} reset.`));
    // Begin rendering.
    await Promise.all(
      files.map(async (file) => {
        const outFile = pathResolve(
          pathJoin(pathJoin(outDir, pathDirname(file).slice(sourceDir.length)), `${pathBasename(file, '.scss')}.css`),
        );
        await createDir(pathDirname(outFile));
        // Render and write.
        const result = await sassRender({
          file,
          outputStyle: localArgs['output-style'],
          outFile,
          sourceMap: localArgs.s,
          functions: exportSass(absCwd),
        });
        await fsPromises.writeFile(
          outFile,
          postcss([autoprefixer({ grid: true }), postcssCustomProperties()]).process(result.css.toString(), {
            map: localArgs.s ? { prev: result.map.toString(), inline: true } : false,
          }),
        );
        if (localArgs.s) {
          return messages.push(`${file} -> ${cyan(outFile)} with sourcemap.`);
        }
        return messages.push(`${file} -> ${cyan(`${outFile}`)}`);
      }),
    );
    messages.push(green(`Built ${files.length} SASS files to ${pathResolve(outDir)}.`));
    return report(messages);
  } catch (e) {
    process.exitCode = 1;
    return console.error(e);
  }
};

const buildJs = async (args, config) => {
  try {
    const messages = [];
    const absCwd = getAbsBuildPath(config.cwd);
    const ignore = ['**/node_modules/**'];
    if (config.jsIgnore) {
      ignore.push(...config.jsIgnore);
    }
    if (args.jsIgnore.length > 0) {
      ignore.push(...args.jsIgnore);
    }
    const sourceDir = pathJoin(absCwd, 'js');
    const outDir = pathJoin(absCwd, 'dist/js');
    const files = await globPromise(pathJoin(sourceDir, '**/*.es*.js'), { ignore });
    if (files.length === 0) {
      return console.warn(`No '.es*.js' files found in ${sourceDir}`);
    }
    // Reset output.
    await removeDir(outDir);
    messages.push(yellow(`Directory ${pathResolve(outDir)} reset.`));
    // Begin rendering.
    await Promise.all(
      files.map(async (file) => {
        const ext = file.match(/.es\d.js$/)[0];
        if (ext === null) {
          return console.warn(`${file} doesn't have a proper extension.`);
        }
        const outFile = pathResolve(
          pathJoin(pathJoin(outDir, pathDirname(file).slice(sourceDir.length)), `${pathBasename(file, ext)}.js`),
        );
        await createDir(pathDirname(outFile));
        // Render and write.
        const result = await transform(file, { sourceMaps: args.s ? 'inline' : false });
        await fsPromises.writeFile(outFile, result.code);
        if (args.s) {
          return messages.push(`${file} -> ${cyan(outFile)} with sourcemap.`);
        }
        return messages.push(`${file} -> ${cyan(outFile)}`);
      }),
    );
    messages.push(green(`Built ${files.length} Javascript files to ${outDir}.`));
    return report(messages);
  } catch (e) {
    process.exitCode = 1;
    return console.error(e);
  }
};

const build = async (args) => {
  try {
    const promises = [];
    switch (typeof settings) {
      case 'string':
        promises.push(buildSass(args, settingsPath));
        promises.push(buildJs(args, settingsPath));
        break;
      case 'object':
        await settings.map(async (config) => {
          if (config.cwd === undefined || typeof config.cwd !== 'string') {
            return console.warn(yellow('Cwd not defined or not string in .unicompilerc.json.'));
          }
          return promises.push(
            Promise.all([buildSass(args, config), buildJs(args, config)]).catch((e) => {
              throw e;
            }),
          );
        });
        break;
      default:
        throw new Error('The provided settings are not of type array or string.');
    }
    await Promise.all(promises);
    return console.log(green('Build complete'));
  } catch (e) {
    process.exitCode = 1;
    return console.error(e);
  }
};

const watch = (args) => {
  const watchPaths = [];
  settings.map((config) => {
    const absCwd = getAbsBuildPath(config.cwd);
    watchPaths.push(pathJoin(absCwd, 'js'));
    return watchPaths.push(pathJoin(absCwd, 'scss'));
  });
  return chokidarWatch(watchPaths, {
    ignoreInitial: true,
    followSymlinks: false,
  })
    .on('ready', () => {
      return build(args, settings);
    })
    .on('error', (e) => {
      console.error(e);
    })
    .on('all', (event, file) => {
      console.log(`${yellow(event)} ${file}`);
      return build(args, settings);
    });
};

module.exports.handler = async (args) => {
  settingsPath = 'path' in args ? pathResolve(args.path) : false;
  if (settingsPath) {
    settings = await getSettings(settingsPath);
    console.log(`Looking for configuration in ${settingsPath}...`);
  } else {
    settingsPath = process.cwd();
    settings = await getSettings(settingsPath);
    console.log('Looking for configuration in current directory...');
  }
  if (settings !== false) {
    console.log('Config file found.');
  }
  if (settings === false && settingsPath === false) {
    return console.log('No config or path provided, build unsuccessful.');
  }
  if (settings === false && settingsPath.length > 0) {
    settings = settingsPath;
    console.log(`Configuration file not found. Trying to build ${settingsPath}`);
  }
  if (args.w) {
    return watch(args, settings);
  }
  return build(args, settings);
};

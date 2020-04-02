require('console-stamp')(console, {
  pattern: 'HH:MM:ss',
  colors: {
    label: 'gray',
  },
});
const { yellow, cyan, green } = require('chalk');
const { watch: chokidarWatch } = require('chokidar');
const {
  relative: pathRelative,
  join: pathJoin,
  normalize: pathNormalize,
  dirname: pathDirname,
  basename: pathBasename,
} = require('path');
const { render: sassRender } = require('node-sass-promise');
const { promises: fsPromises } = require('fs');
const postcss = require('postcss');
const postcssCustomProperties = require('postcss-custom-properties');
const autoprefixer = require('autoprefixer');
const mkdirp = require('mkdirp');
const _ = require('lodash');
const globPromise = require('glob-promise');
const exportSass = require('node-sass-export');
const { transformFileAsync: transform } = require('@babel/core');
const { getConfig, report, removeDir } = require('./utils');

let source = false;
let config = false;

module.exports.command = 'build [source] [output]';
module.exports.describe =
  'Build project Javascript and SCSS. An optional path can be given to use instead of the configuration file.';
module.exports.builder = {
  w: {
    type: 'boolean',
    default: false,
    describe: 'Watch a directory.',
    alias: ['watch'],
  },
  o: {
    type: 'string',
    default: false,
    describe: 'The path for the output relative to where the command was run.',
    alias: ['output', 'out'],
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

const buildSass = async (settings) => {
  try {
    const messages = [];
    const localSettings = _.cloneDeep(settings);

    // Prepare source and output paths.
    const sourceDir = pathJoin(localSettings.cwd, 'scss');
    const outDir = pathJoin(localSettings.o, 'css');

    // Collect files.
    const files = await globPromise(pathJoin(sourceDir, '**/*.scss'), { ignore: localSettings.sassIgnore });
    if (files.length === 0) {
      return console.warn(`No '*.scss' files found in '${sourceDir}'`);
    }

    // Reset output.
    await removeDir(outDir);
    messages.push(yellow(`Directory ${outDir} reset.`));
    // Begin rendering.
    await Promise.all(
      files.map(async (file) => {
        const outFile = pathNormalize(
          pathJoin(pathJoin(outDir, pathDirname(file).slice(sourceDir.length)), `${pathBasename(file, '.scss')}.css`),
        );
        await mkdirp(pathDirname(outFile));
        // Render and write.
        const result = await sassRender({
          file,
          outputStyle: localSettings['output-style'],
          outFile,
          sourceMap: localSettings.s,
          functions: exportSass(localSettings.cwd),
        });
        await fsPromises.writeFile(
          outFile,
          postcss([autoprefixer({ grid: true }), postcssCustomProperties()]).process(result.css.toString(), {
            map: localSettings.s ? { prev: result.map.toString(), inline: true } : false,
          }),
        );
        if (localSettings.s) {
          return messages.push(`${file} -> ${cyan(outFile)} with sourcemap.`);
        }
        return messages.push(`${file} -> ${cyan(`${outFile}`)}`);
      }),
    );
    messages.push(green(`Built ${files.length} SASS files to ${pathNormalize(outDir)}.`));
    return report(messages);
  } catch (e) {
    process.exitCode = 1;
    return console.error(e);
  }
};

const buildJs = async (settings) => {
  try {
    const messages = [];
    const localSettings = _.cloneDeep(settings);

    // Prepare source and output paths.
    const sourceDir = pathJoin(localSettings.cwd, 'js');
    const outDir = pathJoin(localSettings.o, 'js');

    // Collect files.
    const files = await globPromise(pathJoin(sourceDir, '**/*.es*.js'), { ignore: localSettings.jsIgnore });
    if (files.length === 0) {
      return console.warn(`No '*.js' files found in '${sourceDir}'`);
    }
    // Reset output.
    await removeDir(outDir);
    messages.push(yellow(`Directory ${pathNormalize(outDir)} reset.`));

    // Begin rendering.
    await Promise.all(
      files.map(async (file) => {
        let ext = file.match(/.es\d.js$/);
        if (ext === null) {
          ext = '';
        } else {
          [ext] = ext;
        }

        const outFile = pathNormalize(
          pathJoin(pathJoin(outDir, pathDirname(file).slice(sourceDir.length)), `${pathBasename(file, ext)}.js`),
        );
        await mkdirp(pathDirname(outFile));
        // Render and write.
        const result = await transform(file, {
          rootMode: 'upward-optional',
          sourceMaps: localSettings.s ? 'inline' : false,
        });
        await fsPromises.writeFile(outFile, result.code);
        if (localSettings.s) {
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
    const settings = {};
    settings['output-style'] = 'compressed';

    // Development mode.
    if (args.develop) {
      settings.s = true;
      settings['output-style'] = 'expanded';
    }
    // Sourcemap.
    if (args.s) {
      settings.s = true;
    }

    // Prepare SASS ignored globs.
    settings.sassIgnore = ['**/_*.scss'];
    if (args.sassIgnore.length > 0) {
      settings.sassIgnore.push(...args.sassIgnore);
    }

    // Prepare Javascript ignored globs.
    settings.jsIgnore = ['**/node_modules/**'];
    if (args.jsIgnore.length > 0) {
      settings.jsIgnore.push(...args.jsIgnore);
    }

    if (config === false) {
      settings.cwd = source;
      // Set output if argument is given.
      if (args.o) {
        settings.o = pathNormalize(args.o);
      } else {
        settings.o = pathJoin(settings.cwd, 'dist');
      }
      promises.push(buildSass(settings));
      promises.push(buildJs(settings));
    } else {
      await config.map(async (component) => {
        if (component.cwd === undefined || typeof component.cwd !== 'string') {
          return console.warn(yellow('Cwd not defined or not string in .unicompilerc.json.'));
        }
        settings.cwd = pathJoin(source, component.cwd);

        // Set output if argument is given.
        if (args.o) {
          settings.o = pathNormalize(args.o);
        }

        // If component has output option, use that.
        if (component.o && component.o.length > 0) {
          settings.o = pathNormalize(component.o);
        }

        // If there was no argument given and output wasn't defined in the component, fall back to default.
        if (!args.o && !component.o) {
          settings.o = pathJoin(settings.cwd, 'dist');
        }

        // Add component specific ignores.
        if (component.sassIgnore) {
          settings.sassIgnore.push(...component.sassIgnore);
        }
        if (component.jsIgnore) {
          settings.jsIgnore.push(...component.sassIgnore);
        }
        return promises.push(
          Promise.all([buildSass(settings), buildJs(settings)]).catch((e) => {
            throw e;
          }),
        );
      });
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
  config.map((component) => {
    const cwd = pathJoin(source, component.cwd);
    watchPaths.push(pathJoin(cwd, 'js'));
    return watchPaths.push(pathJoin(cwd, 'scss'));
  });
  return chokidarWatch(watchPaths, {
    ignoreInitial: true,
    followSymlinks: false,
  })
    .on('ready', () => {
      return build(args, config);
    })
    .on('error', (e) => {
      console.error(e);
    })
    .on('all', (event, file) => {
      console.log(`${yellow(event)} ${file}`);
      return build(args, config);
    });
};

module.exports.handler = async (args) => {
  source = 'source' in args ? pathNormalize(args.source) : false;
  // Look for a config file at the given source argument first.
  if (source !== false) {
    console.log(`Looking for configuration in ${source}...`);
    config = await getConfig(source);
    if (config === false && source.length > 0) {
      console.log(`Configuration file not found. Trying to build ${source}`);
    }
  } else {
    // If there is no source argument, look for a config file in current dir.
    source = pathRelative(process.cwd(), '.');
    console.log('Looking for configuration in current directory...');
    config = await getConfig(source);
    if (config === false) {
      console.log(`Configuration file not found. Trying to build current directory...`);
    }
  }

  // Report if config are found.
  if (typeof config === 'object') {
    console.log('Config file found.');
  }

  if (args.w) {
    return watch(args, config);
  }
  return build(args, config);
};

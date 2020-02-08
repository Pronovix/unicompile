#!/usr/bin/env node
const argv = require('yargs');

// eslint-disable-next-line no-unused-expressions
argv
  .usage('Usage: $0 <command> [options]')
  .command(require('../lib/init'))
  .example('$0 init', 'Create a .unicompilerc.json file.')
  .command(require('../lib/build'))
  .example('$0 build', 'Compile both SASS and Javscript.')
  .demandCommand(1, 'No commands given.')
  .help('h')
  .alias({
    v: 'version',
    h: 'help',
  }).argv;

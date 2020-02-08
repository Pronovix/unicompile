# Description

A tool primarily created for Drupal themes and modules to compile SASS and ES5+ Javascript into ES5 based on a configuration file.

Paths to projects can be defined, then every `js/**/*.es*.js` and `scss/**/*.scss` file is compiled into a `dist/css` or `dist/js` folder.

# Installation

Local install:

```shell
npm install unicompile
```

Local dev install:

```shell
npm install -D unicompile
```

Global install:

```shell
npm install -g unicompile
```

# Usage

You'll need a `.unicompilerc.json` file in your working directory. This file will provide all the information for the compiler to do its job.

1. To initialize the config file run `node node_modules/unicompile/bin/unicompile.js init` (or `unicompile init` if you installed globally)
2. If installed locally run `node node_modules/unicompile/bin/unicompile.js -h` to see available commands.
3. If installed globally run `unicompile -h` to see available commands.

# Requirements

The only thing needed is a `.unicompilerc.json` file. This file should contain a single array containing configuration objects.

**IMPORTANT**

As this package is utilizing Babel it is heavily advised to include a `.babelrc` or a `babel.config.json` file in your project.

See [Babel Config Files documentation](https://babeljs.io/docs/en/config-files) for further information.

# Configuration options:

## `cwd`

- Type: `String`
- Default: `undefined`

A mandatory option for defining the project folder. This path can be either relative or absolute. Be mindful that this shouldn't include the glob pattern.

Example:

In `.unicompilerc.json`:

```json
[
  {
    "cwd": "/home/johndoe/projects/project1"
  },
  {
    "cwd": "/home/johndoe/projects/project2"
  }
]
```

## `sassIgnore` (optional)

- Type: `Array<String>`
- Default: `[]`

An array of glob patterns to ignore.

Example:

In `.unicompilerc.json`:

```json
[
  {
    "cwd": "/home/johndoe/projects/project1",
    "sassIgnore": ["**/vendor/**"]
  }
]
```

### `jsIgnore` (optional)

- Type: `Array<String>`
- Default: undefined

An array of glob patterns to ignore. `node_modules` folder is excluded by default. See [Glob Primer](https://www.npmjs.com/package/glob#glob-primer) for further information.

Example:

In `.unicompilerc.json`:

```json
[
  {
    "cwd": "/home/johndoe/projects/project1",
    "jsIgnore": ["**/vendor/**"]
  }
]
```

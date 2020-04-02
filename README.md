# Description

A tool primarily created for Drupal themes and modules to compile SASS and ES5+ Javascript into ES5 based on a configuration file.

Paths to projects can be defined, then every `js/**/*.js` and `scss/**/*.scss` file is compiled into a `dist/css` or `dist/js` folder by default, or a folder of your choice if you provde an argument.

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

```shell
unicompile build [options] [source] [output]
```

1. (optional) To initialize the config file run `node node_modules/.bin/unicompile init` (or `unicompile init` if you installed globally)
2. If installed locally run `node node_modules/.bin/unicompile -h` to see available commands.
3. If installed globally run `unicompile -h` to see available commands.

**IMPORTANT**

As this package is utilizing Babel it is heavily advised to include a `.babelrc` or a `babel.config.json` file in your project.

See [Babel Config Files documentation](https://babeljs.io/docs/en/config-files) for further information.

# Configuration options for the config file:

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

## `out`

- Type: `String`
- Default: `undefined`

An optional path for the output folder. If this option is not given, `"${cwd}/dist"` is used as a default output path.

Example:

In `.unicompilerc.json`:

```json
[
  {
    "cwd": "/home/johndoe/projects/project1/src",
    "out": "/home/johndoe/projects/project1/build"
  },
  {
    "cwd": "/home/johndoe/projects/project2/src",
    "out": "/home/johndoe/projects/project2/build"
  }
]
```

## `sassIgnore` (optional)

- Type: `Array<String>`
- Default: `[]`

An array of glob patterns to ignore. See [Glob Primer](https://www.npmjs.com/package/glob#glob-primer) for further information.

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

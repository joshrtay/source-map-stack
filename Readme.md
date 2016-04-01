
# source-map-stack

[![Build status][travis-image]][travis-url]
[![Git tag][git-image]][git-url]
[![NPM version][npm-image]][npm-url]
[![Code style][standard-image]][standard-url]

Source map stack traces.

## Installation

    $ npm install source-map-stack

## Usage

```js
var sourceMap = require('source-map-stack')

var content = fs.readFileSync('build.js')
var map = sourceMap.get(content)
try {
  vm.runInNewContext(content, ctx)
} catch(e) {
  console.error()
  console.error(sourceMap.stack(map, e))
}

```

## API

### .get(content)

- `content` - file contents with source map embedded

**Returns:** a SourceMapConsumer from mozilla's `source-map`

## .stack(map, error, base)

- `map` - a source map consumer
- `error` - the error whose stack will be mapped
- `base` - basepath of paths used in stack trace

**Returns:** a mapped stack trace

## License

MIT

[travis-image]: https://img.shields.io/travis/joshrtay/source-map-stack.svg?style=flat-square
[travis-url]: https://travis-ci.org/joshrtay/source-map-stack
[git-image]: https://img.shields.io/github/tag/joshrtay/source-map-stack.svg
[git-url]: https://github.com/joshrtay/source-map-stack
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat
[standard-url]: https://github.com/feross/standard
[npm-image]: https://img.shields.io/npm/v/source-map-stack.svg?style=flat-square
[npm-url]: https://npmjs.org/package/source-map-stack

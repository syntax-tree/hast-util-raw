# hast-util-raw [![Build Status][travis-badge]][travis] [![Coverage Status][codecov-badge]][codecov]

Reparse a [HAST][] tree, with support for embedded `raw`
nodes.

One of the reasons to do this is for “malformed” syntax trees: for
example, say there’s an `h1` element in a `p` element, this utility
will make them siblings.

Another reason to do this is if raw HTML/XML is embedded in a syntax
tree, such as markdown.  If you’re working with markdown, use
[**remark-rehype**][remark-rehype] and [**rehype-raw**][rehype-raw].

## Installation

[npm][]:

```bash
npm install hast-util-raw
```

## Usage

```javascript
var h = require('hastscript');
var raw = require('hast-util-raw');

var tree = h('div', [
  h('h1', [
    'Foo ',
    h('h2', 'Bar'),
    ' Baz'
  ])
]);

var clean = raw(tree);

console.log(clean);
```

Yields:

```javascript
{ type: 'element',
  tagName: 'div',
  properties: {},
  children:
   [ { type: 'element',
       tagName: 'h1',
       properties: {},
       children: [Object] },
     { type: 'element',
       tagName: 'h2',
       properties: {},
       children: [Object] },
     { type: 'text', value: ' Baz' } ] }
```

## API

### `raw(tree[, file])`

Given a [HAST][] tree and an optional [vfile][] (for positional info),
return a new parsed-again [HAST][] tree.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[travis-badge]: https://img.shields.io/travis/wooorm/hast-util-raw.svg

[travis]: https://travis-ci.org/wooorm/hast-util-raw

[codecov-badge]: https://img.shields.io/codecov/c/github/wooorm/hast-util-raw.svg

[codecov]: https://codecov.io/github/wooorm/hast-util-raw

[npm]: https://docs.npmjs.com/cli/install

[license]: LICENSE

[author]: http://wooorm.com

[hast]: https://github.com/wooorm/hast

[remark-rehype]: https://github.com/wooorm/remark-rehype

[rehype-raw]: https://github.com/wooorm/rehype-raw

[vfile]: https://github.com/wooorm/vfile

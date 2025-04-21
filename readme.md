# hast-util-raw

[![Build][badge-build-image]][badge-build-url]
[![Coverage][badge-coverage-image]][badge-coverage-url]
[![Downloads][badge-downloads-image]][badge-downloads-url]
[![Size][badge-size-image]][badge-size-url]

[hast][github-hast] utility to parse the tree and semistandard `raw` nodes
(strings of HTML) again, keeping positional info okay.

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`Options`](#options)
  * [`raw(tree, options)`](#rawtree-options)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a utility to parse a document again.
It passes each node and embedded raw HTML through an HTML parser
([`parse5`][github-parse5]), to recreate a tree exactly as how a browser would
parse it, while keeping the original data and positional info intact.

## When should I use this?

This utility is particularly useful when coming from markdown and wanting to
support HTML embedded inside that markdown (which requires passing
`allowDangerousHtml: true` to
[`mdast-util-to-hast`][github-mdast-util-to-hast]).
Markdown dictates how, say, a list item or emphasis can be parsed.
We can use that to turn the markdown syntax tree into an HTML syntax tree.
But markdown also dictates that things that look like HTML, are passed through
untouched, even when it just looks like XML but doesn’t really make sense, so we
can’t normally use these strings of “HTML” to create an HTML syntax tree.
This utility can.
It can be used to take those strings of HTML and include them into the syntax
tree as actual nodes.

If your final result is HTML and you trust content, then “strings” are fine
(you can pass `allowDangerousHtml: true` to `hast-util-to-html`, which passes
HTML through untouched).
But there are two main cases where a proper syntax tree is preferred:

* hast utilities need a proper syntax tree as they operate on actual nodes to
  inspect or transform things, they can’t operate on strings of HTML
* other output formats (React, MDX, etc) need actual nodes and can’t handle
  strings of HTML

The plugin [`rehype-raw`][github-rehype-raw] wraps this utility at a
higher-level (easier) abstraction.

## Install

This package is [ESM only][github-gist-esm].
In Node.js (version 16+), install with [npm][npmjs-install]:

```sh
npm install hast-util-raw
```

In Deno with [`esm.sh`][esmsh]:

```js
import {raw} from 'https://esm.sh/hast-util-raw@9'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {raw} from 'https://esm.sh/hast-util-raw@9?bundle'
</script>
```

## Use

```js
import {h} from 'hastscript'
import {raw} from 'hast-util-raw'

const tree = h('div', [h('h1', ['Foo ', h('h2', 'Bar'), ' Baz'])])

const reformatted = raw(tree)

console.log(reformatted)
```

Yields:

```js
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

### `Options`

Configuration.

###### Fields

* `file?` (`VFile | null | undefined`)
  — corresponding virtual file representing the input document (optional)
* `passThrough?` (`Array<string> | null | undefined`)

  List of custom hast node types to pass through (as in, keep) (optional).

  If the passed through nodes have children, those children are expected to
  be hast again and will be handled.
* `tagfilter?` (`boolean | null | undefined`)

  Whether to disallow irregular tags in `raw` nodes according to GFM
  tagfilter
  (default: `false`).

  This affects the following tags,
  grouped by their kind:
  * `RAWTEXT`: `iframe`, `noembed`, `noframes`, `style`, `xmp`
  * `RCDATA`: `textarea`, `title`
  * `SCRIPT_DATA`: `script`
  * `PLAINTEXT`: `plaintext`
  When you know that you do not want authors to write these tags,
  you can enable this option to prevent their use from running amok.

  See:
  [*Disallowed Raw HTML* in
  `cmark-gfm`](https://github.github.com/gfm/#disallowed-raw-html-extension-).

### `raw(tree, options)`

Pass a hast tree through an HTML parser, which will fix nesting, and turn
raw nodes into actual nodes.

###### Parameters

* `tree` (`Root | RootContent`)
  — original hast tree to transform
* `options?` (`Options | null | undefined`)
  — configuration (optional)

###### Returns

Parsed again tree (`Root | RootContent`).

## Types

This package is fully typed with [TypeScript][].
It exports the additional type [`Options`][api-options].

The `Raw` node type is registered by and exposed from
[`mdast-util-to-hast`][github-mdast-util-to-hast].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `hast-util-raw@^9`,
compatible with Node.js 16.

## Security

Use of `hast-util-raw` can open you up to a
[cross-site scripting (XSS)][wikipedia-xss]
attack as `raw` nodes are unsafe.
The following example shows how a raw node is used to inject a script that runs
when loaded in a browser.

```js
raw(u('root', [u('raw', '<script>alert(1)</script>')]))
```

Yields:

```html
<script>alert(1)</script>
```

Either do not use this utility in combination with user input, or use
[`hast-util-santize`][github-hast-util-sanitize].

## Related

* [`mdast-util-to-hast`][github-mdast-util-to-hast]
  — transform mdast to hast
* [`rehype-raw`][github-rehype-raw]
  — rehype plugin

## Contribute

See [`contributing.md`][health-contributing] in [`syntax-tree/.github`][health]
for ways to get started.
See [`support.md`][health-support] for ways to get help.

This project has a [code of conduct][health-coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][file-license] © [Titus Wormer][wooorm]

<!-- Definitions -->

[api-options]: #options

[badge-build-image]: https://github.com/syntax-tree/hast-util-raw/workflows/main/badge.svg

[badge-build-url]: https://github.com/syntax-tree/hast-util-raw/actions

[badge-coverage-image]: https://img.shields.io/codecov/c/github/syntax-tree/hast-util-raw.svg

[badge-coverage-url]: https://codecov.io/github/syntax-tree/hast-util-raw

[badge-downloads-image]: https://img.shields.io/npm/dm/hast-util-raw.svg

[badge-downloads-url]: https://www.npmjs.com/package/hast-util-raw

[badge-size-image]: https://img.shields.io/bundlejs/size/hast-util-raw

[badge-size-url]: https://bundlejs.com/?q=hast-util-raw

[esmsh]: https://esm.sh

[file-license]: license

[github-gist-esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[github-hast]: https://github.com/syntax-tree/hast

[github-hast-util-sanitize]: https://github.com/syntax-tree/hast-util-sanitize

[github-mdast-util-to-hast]: https://github.com/syntax-tree/mdast-util-to-hast

[github-parse5]: https://github.com/inikulin/parse5

[github-rehype-raw]: https://github.com/rehypejs/rehype-raw

[health]: https://github.com/syntax-tree/.github

[health-coc]: https://github.com/syntax-tree/.github/blob/main/code-of-conduct.md

[health-contributing]: https://github.com/syntax-tree/.github/blob/main/contributing.md

[health-support]: https://github.com/syntax-tree/.github/blob/main/support.md

[npmjs-install]: https://docs.npmjs.com/cli/install

[typescript]: https://www.typescriptlang.org

[wikipedia-xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

[wooorm]: https://wooorm.com

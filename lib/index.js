/**
 * @typedef {import('parse5').DefaultTreeAdapterMap} DefaultTreeAdapterMap
 * @typedef {import('parse5').Token.CharacterToken} CharacterToken
 * @typedef {import('parse5').Token.CommentToken} CommentToken
 * @typedef {import('parse5').Token.DoctypeToken} DoctypeToken
 * @typedef {import('parse5').Token.TagToken} TagToken
 * @typedef {import('parse5').Token.Location} Location
 * @typedef {import('parse5').ParserOptions<DefaultTreeAdapterMap>} ParserOptions
 *
 * @typedef {import('vfile').VFile} VFile
 *
 * @typedef {import('unist').Point} Point
 *
 * @typedef {import('hast').Root} Root
 * @typedef {import('hast').DocType} Doctype
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Text} Text
 * @typedef {import('hast').Comment} Comment
 * @typedef {import('hast').Content} Content
 *
 * @typedef {import('../complex-types.js').Raw} Raw
 */

/**
 * @typedef {Root | Content} Node
 *
 * @typedef {{type: 'comment', value: {stitch: Node}}} Stitch
 *
 * @typedef Options
 *   Configuration.
 * @property {Array<string> | null | undefined} [passThrough]
 *   List of custom hast node types to pass through (keep) in hast.
 *
 *   If the passed through nodes have children, those children are expected to
 *   be hast again and will be handled.
 * @property {VFile | null | undefined} [file]
 *   Corresponding virtual file.
 *
 * @typedef State
 *   Info passed around about the current state.
 * @property {Parser<DefaultTreeAdapterMap>} parser
 *   Current parser.
 * @property {(node: Node) => void} handle
 *   Add a hast node to the parser.
 * @property {boolean} stitches
 *   Whether there are stitches.
 * @property {Options} options
 *   User configuration.
 */

import extend from 'extend'
import {fromParse5} from 'hast-util-from-parse5'
import {toParse5} from 'hast-util-to-parse5'
import {htmlVoidElements} from 'html-void-elements'
import {Parser, Token, TokenizerMode, html} from 'parse5'
import {pointStart, pointEnd} from 'unist-util-position'
import {visit} from 'unist-util-visit'
import {zwitch} from 'zwitch'

/** @type {ParserOptions} */
const parseOptions = {sourceCodeLocationInfo: true, scriptingEnabled: false}

/**
 * Pass a hast tree through an HTML parser, which will fix nesting, and
 * turn raw nodes into actual nodes.
 *
 * @param {Node} tree
 *   Original hast tree to transform.
 * @param {Options | null | undefined} [options]
 *   Configuration.
 * @returns {Node}
 *   Parsed again tree.
 */
export function raw(tree, options) {
  const document = documentMode(tree)
  /** @type {(node: Node, state: State) => void} */
  const one = zwitch('type', {
    handlers: {root, element, text, comment, doctype, raw: handleRaw},
    unknown
  })

  /** @type {State} */
  const state = {
    parser: document
      ? new Parser(parseOptions)
      : Parser.getFragmentParser(null, parseOptions),
    handle(node) {
      one(node, state)
    },
    stitches: false,
    options: options || {}
  }

  one(tree, state)
  resetTokenizer(state, pointStart())

  const p5 = document ? state.parser.document : state.parser.getFragment()
  const result = fromParse5(p5, {
    // To do: support `space`?
    file: state.options.file
  })

  if (state.stitches) {
    visit(result, 'comment', (node, index, parent) => {
      const stitch = /** @type {Stitch} */ (/** @type {unknown} */ (node))
      if (stitch.value.stitch && parent !== null && index !== null) {
        // @ts-expect-error: assume the stitch is allowed.
        parent.children[index] = stitch.value.stitch
        return index
      }
    })
  }

  // Unpack if possible and when not given a `root`.
  if (
    tree.type !== 'root' &&
    result.type === 'root' &&
    result.children.length === 1
  ) {
    return result.children[0]
  }

  return result
}

/**
 * Transform all nodes
 *
 * @param {Array<Content>} nodes
 *   hast content.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {void}
 *   Nothing.
 */
function all(nodes, state) {
  let index = -1

  /* istanbul ignore else - invalid nodes, see rehypejs/rehype-raw#7. */
  if (nodes) {
    while (++index < nodes.length) {
      state.handle(nodes[index])
    }
  }
}

/**
 * Transform a root.
 *
 * @param {Root} node
 *   hast root node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {void}
 *   Nothing.
 */
function root(node, state) {
  all(node.children, state)
}

/**
 * Transform an element.
 *
 * @param {Element} node
 *   hast element node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {void}
 *   Nothing.
 */
function element(node, state) {
  resetTokenizer(state, pointStart(node))
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.currentToken = startTag(node)
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser._processToken(state.parser.currentToken)

  all(node.children, state)

  if (!htmlVoidElements.includes(node.tagName)) {
    resetTokenizer(state, pointEnd(node))
    // @ts-expect-error: private.
    // type-coverage:ignore-next-line
    state.parser.currentToken = endTag(node)
    // @ts-expect-error: private.
    // type-coverage:ignore-next-line
    state.parser._processToken(state.parser.currentToken)
  }
}

/**
 * Transform a text.
 *
 * @param {Text} node
 *   hast text node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {void}
 *   Nothing.
 */
function text(node, state) {
  /** @type {CharacterToken} */
  const token = {
    type: Token.TokenType.CHARACTER,
    chars: node.value,
    location: createParse5Location(node)
  }

  resetTokenizer(state, pointStart(node))
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.currentToken = token
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser._processToken(state.parser.currentToken)
}

/**
 * Transform a doctype.
 *
 * @param {Doctype} node
 *   hast doctype node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {void}
 *   Nothing.
 */
function doctype(node, state) {
  /** @type {DoctypeToken} */
  const token = {
    type: Token.TokenType.DOCTYPE,
    name: 'html',
    forceQuirks: false,
    publicId: '',
    systemId: '',
    location: createParse5Location(node)
  }

  resetTokenizer(state, pointStart(node))
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.currentToken = token
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser._processToken(state.parser.currentToken)
}

/**
 * Transform a stitch.
 *
 * @param {Node} node
 *   unknown node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {void}
 *   Nothing.
 */
function stitch(node, state) {
  // Mark that there are stitches, so we need to walk the tree and revert them.
  state.stitches = true

  /** @type {Node} */
  const clone = cloneWithoutChildren(node)

  // Recurse, because to somewhat handle `[<x>]</x>` (where `[]` denotes the
  // passed through node).
  if ('children' in node && 'children' in clone) {
    const fakeRoot = raw({type: 'root', children: node.children}, state.options)
    // @ts-expect-error Assume a given parent yields a parent.
    clone.children = fakeRoot.children
  }

  // Hack: `value` is supposed to be a string, but as none of the tools
  // (`parse5` or `hast-util-from-parse5`) looks at it, we can pass nodes
  // through.
  comment({type: 'comment', value: {stitch: clone}}, state)
}

/**
 * Transform a comment (or stitch).
 *
 * @param {Comment | Stitch} node
 *   hast comment node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {void}
 *   Nothing.
 */
function comment(node, state) {
  /** @type {string} */
  // @ts-expect-error: yeah, we’re passing stiches through.
  const data = node.value

  /** @type {CommentToken} */
  const token = {
    type: Token.TokenType.COMMENT,
    data,
    location: createParse5Location(node)
  }
  resetTokenizer(state, pointStart(node))
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.currentToken = token
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser._processToken(state.parser.currentToken)
}

/**
 * Transform a raw node.
 *
 * @param {Raw} node
 *   hast raw node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {void}
 *   Nothing.
 */
function handleRaw(node, state) {
  // Reset preprocessor:
  // See: <https://github.com/inikulin/parse5/blob/8e22fe4/packages/parse5/lib/tokenizer/preprocessor.ts#L18-L31>.
  state.parser.tokenizer.preprocessor.html = ''
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.preprocessor.pos = -1
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.preprocessor.lastGapPos = -2
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.preprocessor.gapStack = []
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.preprocessor.skipNextNewLine = false
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.preprocessor.lastChunkWritten = false
  state.parser.tokenizer.preprocessor.endOfChunkHit = false
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.preprocessor.isEol = false

  // Now pass `node.value`.
  setPoint(state, pointStart(node))
  state.parser.tokenizer.write(node.value, false)
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer._runParsingLoop()

  // Character references hang, so if we ended there, we need to flush
  // those too.
  // We reset the preprocessor as if the document ends here.
  // Then one single call to the relevant state does the trick, parse5
  // consumes the whole token.

  // Note: `State` is not exposed by `parse5`, so these numbers are fragile.
  if (
    state.parser.tokenizer.state === 72 /* NAMED_CHARACTER_REFERENCE */ ||
    state.parser.tokenizer.state === 78 /* NUMERIC_CHARACTER_REFERENCE_END */
  ) {
    // @ts-expect-error: private.
    // type-coverage:ignore-next-line
    state.parser.tokenizer.preprocessor.lastChunkWritten = true
    /** @type {number} */
    // @ts-expect-error: private.
    // type-coverage:ignore-next-line
    const cp = state.parser.tokenizer._consume()
    // @ts-expect-error: private.
    // type-coverage:ignore-next-line
    state.parser.tokenizer._callState(cp)
  }
}

/**
 * Crash on an unknown node.
 *
 * @param {unknown} node_
 *   unknown node.
 * @param {State} state
 *   Info passed around about the current state.
 * @returns {void}
 *   Never.
 */
function unknown(node_, state) {
  const node = /** @type {Node} */ (node_)

  if (
    state.options.passThrough &&
    state.options.passThrough.includes(node.type)
  ) {
    stitch(node, state)
  } else {
    // To do: add improved error message.
    throw new Error('Cannot compile `' + node.type + '` node')
  }
}

/**
 * Reset the tokenizer of a parser.
 *
 * @param {State} state
 *   Info passed around about the current state.
 * @param {Point} point
 *   Point.
 * @returns {void}
 *   Nothing.
 */
function resetTokenizer(state, point) {
  setPoint(state, point)

  // Process final characters if they’re still there after hibernating.
  // Similar to:
  // See: <https://github.com/inikulin/parse5/blob/9c683e1/packages/parse5/lib/extensions/location-info/tokenizer-mixin.js#L95>.
  /** @type {CharacterToken} */
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  const token = state.parser.tokenizer.currentCharacterToken

  if (token && token.location) {
    token.location.endLine = state.parser.tokenizer.preprocessor.line
    token.location.endCol = state.parser.tokenizer.preprocessor.col + 1
    token.location.endOffset = state.parser.tokenizer.preprocessor.offset + 1
    // @ts-expect-error: private.
    // type-coverage:ignore-next-line
    state.parser.currentToken = token
    // @ts-expect-error: private.
    // type-coverage:ignore-next-line
    state.parser._processToken(state.parser.currentToken)
  }

  // Reset tokenizer:
  // See: <https://github.com/inikulin/parse5/blob/edb85df/packages/parse5/lib/tokenizer/index.ts#L225-L249>.
  // Especially putting it back in the `data` state is useful: some elements,
  // like textareas and iframes, change the state.
  // See GH-7.
  // But also if broken HTML is in `raw`, and then a correct element is given.
  // See GH-11.
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.paused = false
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.inLoop = false

  // To do: make all of this much smarter: `inForeignNode`, `state`, `returnState`, etc.

  // Note: don’t reset `inForeignNode` so that the state of HTML in SVG
  // in HTML etc is kept.

  state.parser.tokenizer.lastStartTagName = ''
  state.parser.tokenizer.active = false
  state.parser.tokenizer.state = TokenizerMode.DATA
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.returnState = TokenizerMode.DATA
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.charRefCode = -1
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.consumedAfterSnapshot = -1
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.currentLocation = null
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.currentCharacterToken = null
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.currentToken = null
  // @ts-expect-error: private.
  // type-coverage:ignore-next-line
  state.parser.tokenizer.currentAttr = {name: '', value: ''}
}

/**
 * Set current location.
 *
 * @param {State} state
 *   Info passed around about the current state.
 * @param {Point} point
 *   Point.
 * @returns {void}
 *   Nothing.
 */
function setPoint(state, point) {
  if (
    point.line &&
    point.column &&
    point.offset !== null &&
    point.offset !== undefined
  ) {
    /** @type {Location} */
    const location = {
      startLine: point.line,
      startCol: point.column,
      startOffset: point.offset,
      endLine: -1,
      endCol: -1,
      endOffset: -1
    }

    // @ts-expect-error: private.
    // type-coverage:ignore-next-line
    state.parser.tokenizer.preprocessor.lineStartPos = -point.column + 1 // Looks weird, but ensures we get correct positional info.
    state.parser.tokenizer.preprocessor.droppedBufferSize = point.offset
    state.parser.tokenizer.preprocessor.line = point.line
    // @ts-expect-error: private.
    // type-coverage:ignore-next-line
    state.parser.tokenizer.currentLocation = location
  }
}

/**
 * Create a `parse5` `endTag` token.
 *
 * @param {Element} node
 *   Element.
 * @returns {TagToken}
 *   Start tag token.
 */
function startTag(node) {
  // To do: pass `space`.
  const result = toParse5({...node, children: []})
  // Always element.
  /* c8 ignore next */
  const attrs = 'attrs' in result ? result.attrs : []

  return {
    type: Token.TokenType.START_TAG,
    tagName: node.tagName,
    tagID: html.getTagID(node.tagName),
    // We always send start and end tags.
    selfClosing: false,
    ackSelfClosing: false,
    attrs,
    location: createParse5Location(node)
  }
}

/**
 * Create a `parse5` `endTag` token.
 *
 * @param {Element} node
 *   Element.
 * @returns {TagToken}
 *   End tag token.
 */
function endTag(node) {
  return {
    type: Token.TokenType.END_TAG,
    tagName: node.tagName,
    tagID: html.getTagID(node.tagName),
    selfClosing: false,
    ackSelfClosing: false,
    attrs: [],
    location: createParse5Location(node)
  }
}

/**
 * Check if `node` represents a whole document or a fragment.
 *
 * @param {Node} node
 *   hast node.
 * @returns {boolean}
 *   Whether this represents a whole document or a fragment.
 */
function documentMode(node) {
  const head = node.type === 'root' ? node.children[0] : node
  return Boolean(
    head &&
      (head.type === 'doctype' ||
        (head.type === 'element' && head.tagName === 'html'))
  )
}

/**
 * Get a `parse5` location from a node.
 *
 * @param {Node | Stitch} node
 *   hast node.
 * @returns {Location}
 *   `parse5` location.
 */
function createParse5Location(node) {
  const start = pointStart(node)
  const end = pointEnd(node)

  return {
    startLine: start.line,
    startCol: start.column,
    // @ts-expect-error: could be `undefined` in hast, which `parse5` types don’t want.
    startOffset: start.offset,
    endLine: end.line,
    endCol: end.column,
    // @ts-expect-error: could be `undefined` in hast, which `parse5` types don’t want.
    endOffset: end.offset
  }
}

/**
 * @template {Node} NodeType
 *   Node type.
 * @param {NodeType} node
 *   Node to clone.
 * @returns {NodeType}
 *   Cloned node, without children.
 */
function cloneWithoutChildren(node) {
  return 'children' in node
    ? extend(true, {}, {...node, children: []})
    : extend(true, {}, node)
}

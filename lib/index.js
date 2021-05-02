/**
 * @typedef {import('parse5').Document} P5Document
 * @typedef {import('parse5').DocumentFragment} P5Fragment
 * @typedef {import('parse5').Element} P5Element
 * @typedef {import('parse5').Attribute} P5Attribute
 * @typedef {import('parse5').Location} P5Location
 * @typedef {import('parse5').ParserOptions} P5ParserOptions
 * @typedef {import('unist').Node} UnistNode
 * @typedef {import('hast').Parent} Parent
 * @typedef {import('hast').Literal} Literal
 * @typedef {import('hast').Root} Root
 * @typedef {import('hast').DocType} Doctype
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Text} Text
 * @typedef {import('hast').Comment} Comment
 * @typedef {Literal & {type: 'raw'}} Raw
 * @typedef {Parent['children'][number]} Child
 * @typedef {Child|Root|Raw} Node
 * @typedef {import('vfile').VFile} VFile
 * @typedef {Literal & {type: 'comment', value: {stitch: UnistNode}}} Stitch
 *
 * @typedef Options
 * @property {Array.<string>} passThrough List of custom hast node types to pass through (keep) in hast. If the passed through nodes have children, those children are expected to be hast and will be handled
 *
 * @typedef HiddenTokenizer
 * @property {Array.<HiddenLocationTracker>} __mixins Way too simple, but works for us.
 * @property {HiddenPreprocessor} preprocessor
 * @property {(value: string) => void} write
 * @property {Array.<HiddenToken>} tokenQueue
 * @property {string} state
 * @property {string} returnState
 * @property {number} charRefCode
 * @property {Array.<number>} tempBuff
 * @property {string} lastStartTagName
 * @property {number} consumedAfterSnapshot
 * @property {boolean} active
 * @property {HiddenToken} currentCharacterToken
 * @property {HiddenToken} currentToken
 * @property {unknown} currentAttr
 *
 * @typedef {Object.<string, unknown> & {location: P5Location}} HiddenToken
 *
 * @typedef HiddenPreprocessor
 * @property {string} html
 * @property {number} pos
 * @property {number} lastGapPos
 * @property {number} lastCharPos
 * @property {Array.<number>} gapStack
 * @property {boolean} skipNextNewLine
 * @property {boolean} lastChunkWritten
 * @property {boolean} endOfChunkHit
 *
 * @typedef HiddenLocationTracker
 * @property {P5Location} currentAttrLocation
 * @property {P5Location} ctLoc
 * @property {HiddenPosTracker} posTracker
 *
 * @typedef HiddenPosTracker
 * @property {boolean} isEol
 * @property {number} lineStartPos
 * @property {number} droppedBufferSize
 * @property {number} offset
 * @property {number} col
 * @property {number} line
 */

import Parser from 'parse5/lib/parser/index.js'
import {pointStart, pointEnd} from 'unist-util-position'
import {visit} from 'unist-util-visit'
import {fromParse5} from 'hast-util-from-parse5'
import {toParse5} from 'hast-util-to-parse5'
import {htmlVoidElements} from 'html-void-elements'
import {webNamespaces} from 'web-namespaces'
import {zwitch} from 'zwitch'

var inTemplateMode = 'IN_TEMPLATE_MODE'
var dataState = 'DATA_STATE'
var characterToken = 'CHARACTER_TOKEN'
var startTagToken = 'START_TAG_TOKEN'
var endTagToken = 'END_TAG_TOKEN'
var commentToken = 'COMMENT_TOKEN'
var doctypeToken = 'DOCTYPE_TOKEN'

/** @type {P5ParserOptions} */
var parseOptions = {sourceCodeLocationInfo: true, scriptingEnabled: false}

/**
 * Given a hast tree and an optional vfile (for positional info), return a new
 * parsed-again hast tree.
 *
 * @param {Node} tree Original hast tree
 * @param {VFile} [file] Virtual file for positional info
 * @param {Options} [options] Configuration
 */
export function raw(tree, file, options) {
  var index = -1
  var parser = new Parser(parseOptions)
  var one = zwitch('type', {
    handlers: {root, element, text, comment, doctype, raw: handleRaw},
    unknown
  })
  /** @type {boolean} */
  var stitches
  /** @type {HiddenTokenizer} */
  var tokenizer
  /** @type {HiddenPreprocessor} */
  var preprocessor
  /** @type {HiddenPosTracker} */
  var posTracker
  /** @type {HiddenLocationTracker} */
  var locationTracker
  /** @type {Node} */
  var result

  if (isOptions(file)) {
    options = file
    file = undefined
  }

  if (options && options.passThrough) {
    while (++index < options.passThrough.length) {
      one.handlers[options.passThrough[index]] = stitch
    }
  }

  result = fromParse5(documentMode(tree) ? document() : fragment(), file)

  if (stitches) {
    visit(result, 'comment', mend)
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

  /**
   * @type {import('unist-util-visit').Visitor<Stitch>}
   */
  function mend(node, index, parent) {
    if (node.value.stitch) {
      parent.children[index] = node.value.stitch
      return index
    }
  }

  /**
   * @returns {P5Fragment}
   */
  function fragment() {
    /** @type {P5Element} */
    var context = {
      nodeName: 'template',
      tagName: 'template',
      attrs: [],
      namespaceURI: webNamespaces.html,
      childNodes: [],
      parentNode: undefined
    }
    /** @type {P5Element} */
    var mock = {
      nodeName: 'documentmock',
      tagName: 'documentmock',
      attrs: [],
      namespaceURI: webNamespaces.html,
      childNodes: [],
      parentNode: undefined
    }
    /** @type {P5Fragment} */
    var doc = {nodeName: '#document-fragment', childNodes: []}

    parser._bootstrap(mock, context)
    parser._pushTmplInsertionMode(inTemplateMode)
    parser._initTokenizerForFragmentParsing()
    parser._insertFakeRootElement()
    parser._resetInsertionMode()
    parser._findFormInFragmentContext()

    tokenizer = parser.tokenizer
    preprocessor = tokenizer.preprocessor
    locationTracker = tokenizer.__mixins[0]
    posTracker = locationTracker.posTracker

    one(tree)

    parser._adoptNodes(mock.childNodes[0], doc)

    return doc
  }

  /**
   * @returns {P5Document}
   */
  function document() {
    /** @type {P5Document} */
    var doc = parser.treeAdapter.createDocument()

    parser._bootstrap(doc, null)
    tokenizer = parser.tokenizer
    preprocessor = tokenizer.preprocessor
    locationTracker = tokenizer.__mixins[0]
    posTracker = locationTracker.posTracker

    one(tree)

    return doc
  }

  /**
   * @param {Array.<Child>} nodes
   * @returns {void}
   */
  function all(nodes) {
    var index = -1

    /* istanbul ignore else - invalid nodes, see rehypejs/rehype-raw#7. */
    if (nodes) {
      while (++index < nodes.length) {
        one(nodes[index])
      }
    }
  }

  /**
   * @param {Root} node
   * @returns {void}
   */
  function root(node) {
    all(node.children)
  }

  /**
   * @param {Element} node
   * @returns {void}
   */
  function element(node) {
    resetTokenizer()
    parser._processToken(startTag(node), webNamespaces.html)

    all(node.children)

    if (!htmlVoidElements.includes(node.tagName)) {
      resetTokenizer()
      parser._processToken(endTag(node))
    }
  }

  /**
   * @param {Text} node
   * @returns {void}
   */
  function text(node) {
    resetTokenizer()
    parser._processToken({
      type: characterToken,
      chars: node.value,
      location: createParse5Location(node)
    })
  }

  /**
   * @param {Doctype} node
   * @returns {void}
   */
  function doctype(node) {
    resetTokenizer()
    parser._processToken({
      type: doctypeToken,
      name: 'html',
      forceQuirks: false,
      publicId: '',
      systemId: '',
      location: createParse5Location(node)
    })
  }

  /**
   * @param {Comment|Stitch} node
   * @returns {void}
   */
  function comment(node) {
    resetTokenizer()
    parser._processToken({
      type: commentToken,
      data: node.value,
      location: createParse5Location(node)
    })
  }

  /**
   * @param {Raw} node
   * @returns {void}
   */
  function handleRaw(node) {
    var start = pointStart(node)
    var line = start.line || 1
    var column = start.column || 1
    var offset = start.offset || 0
    /** @type {HiddenToken} */
    var token

    // Reset preprocessor:
    // See: <https://github.com/inikulin/parse5/blob/9c683e1/packages/parse5/lib/tokenizer/preprocessor.js>.
    preprocessor.html = null
    preprocessor.pos = -1
    preprocessor.lastGapPos = -1
    preprocessor.lastCharPos = -1
    preprocessor.gapStack = []
    preprocessor.skipNextNewLine = false
    preprocessor.lastChunkWritten = false
    preprocessor.endOfChunkHit = false

    // Reset preprocessor mixin:
    // See: <https://github.com/inikulin/parse5/blob/9c683e1/packages/parse5/lib/extensions/position-tracking/preprocessor-mixin.js>.
    posTracker.isEol = false
    posTracker.lineStartPos = -column + 1 // Looks weird, but ensures we get correct positional info.
    posTracker.droppedBufferSize = offset
    posTracker.offset = 0
    posTracker.col = 1
    posTracker.line = line

    // Reset location tracker:
    // See: <https://github.com/inikulin/parse5/blob/9c683e1/packages/parse5/lib/extensions/location-info/tokenizer-mixin.js>.
    locationTracker.currentAttrLocation = null
    locationTracker.ctLoc = createParse5Location(node)

    // See the code for `parse` and `parseFragment`:
    // See: <https://github.com/inikulin/parse5/blob/9c683e1/packages/parse5/lib/parser/index.js#L371>.
    tokenizer.write(node.value)
    parser._runParsingLoop(null)

    // Process final characters if they’re still there after hibernating.
    // Similar to:
    // See: <https://github.com/inikulin/parse5/blob/9c683e1/packages/parse5/lib/extensions/location-info/tokenizer-mixin.js#L95>.
    token = tokenizer.currentCharacterToken

    if (token) {
      token.location.endLine = posTracker.line
      token.location.endCol = posTracker.col + 1
      token.location.endOffset = posTracker.offset + 1
      parser._processToken(token)
    }
  }

  /**
   * @param {UnistNode} node
   */
  function stitch(node) {
    var clone = Object.assign({}, node)

    stitches = true

    // Recurse, because to somewhat handle `[<x>]</x>` (where `[]` denotes the
    // passed through node).
    if ('children' in node) {
      clone.children = raw(
        // @ts-ignore Assume parent.
        {type: 'root', children: node.children},
        file,
        options
      ).children
    }

    // Hack: `value` is supposed to be a string, but as none of the tools
    // (`parse5` or `hast-util-from-parse5`) looks at it, we can pass nodes
    // through.
    // @ts-ignore
    comment({value: {stitch: clone}})
  }

  function resetTokenizer() {
    // Reset tokenizer:
    // See: <https://github.com/inikulin/parse5/blob/9c683e1/packages/parse5/lib/tokenizer/index.js#L218-L234>.
    // Especially putting it back in the `data` state is useful: some elements,
    // like textareas and iframes, change the state.
    // See GH-7.
    // But also if broken HTML is in `raw`, and then a correct element is given.
    // See GH-11.
    tokenizer.tokenQueue = []
    tokenizer.state = dataState
    tokenizer.returnState = ''
    tokenizer.charRefCode = -1
    tokenizer.tempBuff = []
    tokenizer.lastStartTagName = ''
    tokenizer.consumedAfterSnapshot = -1
    tokenizer.active = false
    tokenizer.currentCharacterToken = null
    tokenizer.currentToken = null
    tokenizer.currentAttr = null
  }
}

/**
 * @param {Element} node
 * @returns {HiddenToken}
 */
function startTag(node) {
  /** @type {unknown} */
  var location = Object.assign(createParse5Location(node), {
    startTag: Object.assign({}, location)
  })

  // Untyped token.
  return {
    type: startTagToken,
    tagName: node.tagName,
    selfClosing: false,
    attrs: attributes(node),
    // @ts-ignore extra positional info.
    location
  }
}

/**
 * @param {Element} node
 * @returns {Array.<P5Attribute>}
 */
function attributes(node) {
  return toParse5({
    tagName: node.tagName,
    type: 'element',
    properties: node.properties,
    children: []
    // @ts-ignore Assume element.
  }).attrs
}

/**
 * @param {Element} node
 * @returns {HiddenToken}
 */
function endTag(node) {
  /** @type {unknown} */
  var location = Object.assign(createParse5Location(node), {
    endTag: Object.assign({}, location)
  })

  // Untyped token.
  return {
    type: endTagToken,
    tagName: node.tagName,
    attrs: [],
    // @ts-ignore extra positional info.
    location
  }
}

/**
 * @param {Node} node
 */
function unknown(node) {
  throw new Error('Cannot compile `' + node.type + '` node')
}

/**
 * @param {Node} node
 * @returns {boolean}
 */
function documentMode(node) {
  var head = node.type === 'root' ? node.children[0] : node
  return Boolean(head && (head.type === 'doctype' || head.tagName === 'html'))
}

/**
 * @param {Node} node
 * @returns {P5Location}
 */
function createParse5Location(node) {
  var start = pointStart(node)
  var end = pointEnd(node)

  return {
    startLine: start.line,
    startCol: start.column,
    startOffset: start.offset,
    endLine: end.line,
    endCol: end.column,
    endOffset: end.offset
  }
}

/**
 * @param {VFile|Options} value
 * @return {value is Options}
 */
function isOptions(value) {
  return value && !('contents' in value)
}

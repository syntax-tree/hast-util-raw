/**
 * @typedef {import('vfile').VFile} VFile
 * @typedef {import('parse5').DefaultTreeAdapterMap} P5Tree
 * @typedef {P5Tree['document']} P5Document
 * @typedef {P5Tree['documentFragment']} P5Fragment
 * @typedef {import('parse5').Token.Attribute} P5Attribute
 * @typedef {Omit<import('parse5').Token.Location, 'startOffset' | 'endOffset'> & {startOffset: number|undefined, endOffset: number|undefined}} P5Location
 * @typedef {import('parse5').ParserOptions<P5Tree>} P5ParserOptions
 * @typedef {import('unist').Point} Point
 * @typedef {import('hast').Root} Root
 * @typedef {import('hast').DocType} Doctype
 * @typedef {import('hast').Element} Element
 * @typedef {import('hast').Text} Text
 * @typedef {import('hast').Comment} Comment
 * @typedef {import('hast').Content} Content
 * @typedef {Root|Content} Node
 * @typedef {import('../complex-types').Raw} Raw
 *
 * @typedef {Omit<Comment, 'value'> & {value: {stitch: Node}}} Stitch
 *
 * @typedef Options
 *   Configuration (optional).
 * @property {Array<string>} [passThrough]
 *   List of custom hast node types to pass through (keep) in hast.
 *   If the passed through nodes have children, those children are expected to
 *   be hast and will be handled.
 */

import {Parser, Token, TokenizerMode, html} from 'parse5'
import {pointStart, pointEnd} from 'unist-util-position'
import {visit} from 'unist-util-visit'
import {fromParse5} from 'hast-util-from-parse5'
import {toParse5} from 'hast-util-to-parse5'
import {htmlVoidElements} from 'html-void-elements'
import {zwitch} from 'zwitch'

/** @type {P5ParserOptions} */
const parseOptions = {sourceCodeLocationInfo: true, scriptingEnabled: false}

/**
 * Given a hast tree and an optional vfile (for positional info), return a new
 * parsed-again hast tree.
 *
 * @param tree
 *   Original hast tree.
 * @param file
 *   Virtual file for positional info, optional.
 * @param options
 *   Configuration.
 */
export const raw =
  /**
   * @type {(
   *   ((tree: Node, file: VFile|undefined, options?: Options) => Node) &
   *   ((tree: Node, options?: Options) => Node)
   * )}
   */
  (
    /**
     * @param {Node} tree
     * @param {VFile} [file]
     * @param {Options} [options]
     */
    function (tree, file, options) {
      let index = -1
      /** @type {(node: Node, parser: Parser<import('parse5').DefaultTreeAdapterMap>) => void} */
      const one = zwitch('type', {
        handlers: {root, element, text, comment, doctype, raw: handleRaw},
        // @ts-expect-error: hush.
        unknown
      })
      /** @type {boolean|undefined} */
      let stitches

      if (isOptions(file)) {
        options = file
        file = undefined
      }

      if (options && options.passThrough) {
        while (++index < options.passThrough.length) {
          // @ts-expect-error: hush.
          one.handlers[options.passThrough[index]] = stitch
        }
      }

      const p5 = documentMode(tree) ? document() : fragment()
      const result = fromParse5(p5, file)

      if (stitches) {
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

      /**
       * @returns {P5Fragment}
       */
      function fragment() {
        /** @type {Parser<P5Tree>} */
        const p = Parser.getFragmentParser(null, parseOptions)
        one(tree, p)
        resetTokenizer(p, pointStart(undefined))
        return p.getFragment()
      }

      /**
       * @returns {P5Document}
       */
      function document() {
        /** @type {Parser<P5Tree>} */
        const p = new Parser(parseOptions)
        one(tree, p)
        resetTokenizer(p, pointStart(undefined))
        return p.document
      }

      /**
       * @param {Array<Content>} nodes
       * @param {Parser<import('parse5').DefaultTreeAdapterMap>} p
       * @returns {void}
       */
      function all(nodes, p) {
        let index = -1

        /* istanbul ignore else - invalid nodes, see rehypejs/rehype-raw#7. */
        if (nodes) {
          while (++index < nodes.length) {
            one(nodes[index], p)
          }
        }
      }

      /**
       * @param {Root} node
       * @param {Parser<import('parse5').DefaultTreeAdapterMap>} p
       * @returns {void}
       */
      function root(node, p) {
        all(node.children, p)
      }

      /**
       * @param {Element} node
       * @param {Parser<import('parse5').DefaultTreeAdapterMap>} p
       * @returns {void}
       */
      function element(node, p) {
        resetTokenizer(p, pointStart(node))
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.currentToken = startTag(node)
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p._processToken(p.currentToken)

        all(node.children, p)

        if (!htmlVoidElements.includes(node.tagName)) {
          resetTokenizer(p, pointEnd(node))
          // @ts-expect-error: private.
          // type-coverage:ignore-next-line
          p.currentToken = endTag(node)
          // @ts-expect-error: private.
          // type-coverage:ignore-next-line
          p._processToken(p.currentToken)
        }
      }

      /**
       * @param {Text} node
       * @param {Parser<import('parse5').DefaultTreeAdapterMap>} p
       * @returns {void}
       */
      function text(node, p) {
        /** @type {import('parse5/dist/common/token').CharacterToken} */
        const token = {
          type: Token.TokenType.CHARACTER,
          chars: node.value,
          // @ts-expect-error: fine.
          location: createParse5Location(node)
        }

        resetTokenizer(p, pointStart(node))
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.currentToken = token
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p._processToken(p.currentToken)
      }

      /**
       * @param {Doctype} node
       * @param {Parser<import('parse5').DefaultTreeAdapterMap>} p
       * @returns {void}
       */
      function doctype(node, p) {
        /** @type {import('parse5/dist/common/token').DoctypeToken} */
        const token = {
          type: Token.TokenType.DOCTYPE,
          name: 'html',
          forceQuirks: false,
          publicId: '',
          systemId: '',
          // @ts-expect-error: fine.
          location: createParse5Location(node)
        }

        resetTokenizer(p, pointStart(node))
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.currentToken = token
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p._processToken(p.currentToken)
      }

      /**
       * @param {Comment|Stitch} node
       * @param {Parser<import('parse5').DefaultTreeAdapterMap>} p
       * @returns {void}
       */
      function comment(node, p) {
        /** @type {import('parse5/dist/common/token').CommentToken} */
        const token = {
          type: Token.TokenType.COMMENT,
          // @ts-expect-error: yeah, we’re passing stiches through.
          data: node.value,
          // @ts-expect-error: fine.
          location: createParse5Location(node)
        }
        resetTokenizer(p, pointStart(node))
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.currentToken = token
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p._processToken(p.currentToken)
      }

      /**
       * @param {Raw} node
       * @param {Parser<import('parse5').DefaultTreeAdapterMap>} p
       * @returns {void}
       */
      function handleRaw(node, p) {
        // Reset preprocessor:
        // See: <https://github.com/inikulin/parse5/blob/8e22fe4/packages/parse5/lib/tokenizer/preprocessor.ts#L18-L31>.
        p.tokenizer.preprocessor.html = ''
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.preprocessor.pos = -1
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.preprocessor.lastGapPos = -2
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.preprocessor.gapStack = []
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.preprocessor.skipNextNewLine = false
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.preprocessor.lastChunkWritten = false
        p.tokenizer.preprocessor.endOfChunkHit = false
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.preprocessor.isEol = false

        // Now pass `node.value`.
        setPoint(p, pointStart(node))
        p.tokenizer.write(node.value, false)
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer._runParsingLoop()

        // Character references hang, so if we ended there, we need to flush
        // those too.
        // We reset the preprocessor as if the document ends here.
        // Then one single call to the relevant state does the trick, parse5
        // consumes the whole token.

        // Note: `State` is not exposed by `parse5`, so these numbers are fragile.
        if (
          p.tokenizer.state === 72 /* NAMED_CHARACTER_REFERENCE */ ||
          p.tokenizer.state === 78 /* NUMERIC_CHARACTER_REFERENCE_END */
        ) {
          // @ts-expect-error: private.
          // type-coverage:ignore-next-line
          p.tokenizer.preprocessor.lastChunkWritten = true
          /** @type {number} */
          // @ts-expect-error: private.
          // type-coverage:ignore-next-line
          const cp = p.tokenizer._consume()
          // @ts-expect-error: private.
          // type-coverage:ignore-next-line
          p.tokenizer._callState(cp)
        }
      }

      /**
       * @param {Node} node
       * @param {Parser<import('parse5').DefaultTreeAdapterMap>} p
       */
      function stitch(node, p) {
        stitches = true

        /** @type {Node} */
        let clone

        // Recurse, because to somewhat handle `[<x>]</x>` (where `[]` denotes the
        // passed through node).
        if ('children' in node) {
          clone = {
            ...node,
            children: raw(
              {type: 'root', children: node.children},
              file,
              options
              // @ts-expect-error Assume a given parent yields a parent.
            ).children
          }
        } else {
          clone = {...node}
        }

        // Hack: `value` is supposed to be a string, but as none of the tools
        // (`parse5` or `hast-util-from-parse5`) looks at it, we can pass nodes
        // through.
        comment({type: 'comment', value: {stitch: clone}}, p)
      }

      /**
       * @param {Parser<import('parse5').DefaultTreeAdapterMap>} p
       * @param {Point} point
       */
      function setPoint(p, point) {
        if (
          point.line &&
          point.column &&
          point.offset !== null &&
          point.offset !== undefined
        ) {
          // @ts-expect-error: private.
          // type-coverage:ignore-next-line
          p.tokenizer.preprocessor.lineStartPos = -point.column + 1 // Looks weird, but ensures we get correct positional info.
          p.tokenizer.preprocessor.droppedBufferSize = point.offset
          p.tokenizer.preprocessor.line = point.line

          // @ts-expect-error: private.
          // type-coverage:ignore-next-line
          p.tokenizer.currentLocation = {
            startLine: point.line,
            startCol: point.column,
            startOffset: point.offset,
            endLine: -1,
            endCol: -1,
            endOffset: -1
          }
        }
      }

      /**
       * @param {Parser<import('parse5').DefaultTreeAdapterMap>} p
       * @param {Point} point
       */
      function resetTokenizer(p, point) {
        setPoint(p, point)
        // Process final characters if they’re still there after hibernating.
        // Similar to:
        // See: <https://github.com/inikulin/parse5/blob/9c683e1/packages/parse5/lib/extensions/location-info/tokenizer-mixin.js#L95>.
        /** @type {import('parse5/dist/common/token').CharacterToken} */
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        const token = p.tokenizer.currentCharacterToken

        if (token && token.location) {
          token.location.endLine = p.tokenizer.preprocessor.line
          token.location.endCol = p.tokenizer.preprocessor.col + 1
          token.location.endOffset = p.tokenizer.preprocessor.offset + 1
          // @ts-expect-error: private.
          // type-coverage:ignore-next-line
          p.currentToken = token
          // @ts-expect-error: private.
          // type-coverage:ignore-next-line
          p._processToken(p.currentToken)
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
        p.tokenizer.paused = false
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.inLoop = false

        // Note: don’t reset `inForeignNode` so that the state of HTML in SVG
        // in HTML etc is kept.

        p.tokenizer.lastStartTagName = ''
        p.tokenizer.active = false
        p.tokenizer.state = TokenizerMode.DATA
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.returnState = TokenizerMode.DATA
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.charRefCode = -1
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.consumedAfterSnapshot = -1
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.currentLocation = null
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.currentCharacterToken = null
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.currentToken = null
        // @ts-expect-error: private.
        // type-coverage:ignore-next-line
        p.tokenizer.currentAttr = {name: '', value: ''}
      }
    }
  )

/**
 * @param {Element} node
 * @returns {import('parse5/dist/common/token').TagToken}
 */
function startTag(node) {
  return {
    type: Token.TokenType.START_TAG,
    tagName: node.tagName,
    tagID: html.getTagID(node.tagName),
    selfClosing: false,
    ackSelfClosing: false,
    attrs: attributes(node),
    // @ts-expect-error: fine.
    location: createParse5Location(node)
  }
}

/**
 * @param {Element} node
 * @returns {Array<P5Attribute>}
 */
function attributes(node) {
  const result = toParse5({
    tagName: node.tagName,
    type: 'element',
    properties: node.properties,
    children: []
  })
  // Always element.
  /* c8 ignore next */
  return 'attrs' in result ? result.attrs : []
}

/**
 * @param {Element} node
 * @returns {import('parse5/dist/common/token').TagToken}
 */
function endTag(node) {
  return {
    type: Token.TokenType.END_TAG,
    tagName: node.tagName,
    tagID: html.getTagID(node.tagName),
    selfClosing: false,
    ackSelfClosing: false,
    attrs: [],
    // @ts-expect-error: fine.
    location: createParse5Location(node)
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
  const head = node.type === 'root' ? node.children[0] : node
  return Boolean(
    head &&
      (head.type === 'doctype' ||
        (head.type === 'element' && head.tagName === 'html'))
  )
}

/**
 * @param {Node|Stitch} node
 * @returns {P5Location}
 */
function createParse5Location(node) {
  const start = pointStart(node)
  const end = pointEnd(node)

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
 * @param {VFile|Options|undefined} value
 * @return {value is Options}
 */
function isOptions(value) {
  return Boolean(value && !('message' in value && 'messages' in value))
}

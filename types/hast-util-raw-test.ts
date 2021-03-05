import raw = require('hast-util-raw')
import vFile = require('vfile')

raw({type: 'raw', value: 'example'}) // $ExpectType Node
raw({type: 'element', tagName: 'div', properties: {}, children: []}) // $ExpectType Node
// prettier-ignore
raw({type: 'element', tagName: 'div', properties: {}, children: []}, vFile('test')) // $ExpectType Node

raw({type: 'raw'}, {}) // $ExpectType Node
raw({type: 'raw'}, {passThrough: []}) // $ExpectType Node
raw({type: 'raw'}, {passThrough: ['x']}) // $ExpectType Node
raw({type: 'raw'}, vFile(), {}) // $ExpectType Node

raw() // $ExpectError
raw({}) // $ExpectError
// prettier-ignore
raw({type: 'element', tagName: 'div', properties: {}, children: []}, 'not a vFile') // $ExpectError
raw({type: 'raw'}, {x: 1}) // $ExpectError
raw({type: 'raw'}, {}, vFile()) // $ExpectError

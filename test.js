/**
 * @typedef {import('hast').Root} Root
 * @typedef {import('./test-types')} DoNotTouchAsThisImportIncludesCustomInTree
 */

import test from 'tape'
import {u} from 'unist-builder'
import {h} from 'hastscript'
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import {raw} from './index.js'

test('raw', (t) => {
  t.throws(
    () => {
      raw(u('root', [u('customLiteral', '')]))
    },
    /^Error: Cannot compile `customLiteral` node$/,
    'should throw for unknown nodes'
  )

  t.deepEqual(
    raw(h('#foo.bar', 'baz')),
    h('#foo.bar', 'baz'),
    'should pass elements through'
  )

  t.deepEqual(
    raw(h('img', {alt: 'foo', src: 'bar.jpg'})),
    h('img', {alt: 'foo', src: 'bar.jpg'}),
    'should pass void elements through'
  )

  t.deepEqual(
    raw(u('root', [h('#foo.bar', 'baz')])),
    u('root', {data: {quirksMode: false}}, [h('#foo.bar', 'baz')]),
    'should pass roots through'
  )

  t.deepEqual(
    raw(u('root', [])),
    u('root', {data: {quirksMode: false}}, []),
    'should pass empty root’s through'
  )

  t.deepEqual(
    raw(u('text', 'foo')),
    u('text', 'foo'),
    'should pass texts through'
  )

  t.deepEqual(
    raw(u('comment', 'foo')),
    u('comment', 'foo'),
    'should pass comments through'
  )

  t.deepEqual(
    raw(h('html', {lang: 'en'})),
    h('html', {lang: 'en'}, [h('head'), h('body')]),
    'should pass documents through (#1)'
  )

  t.deepEqual(
    raw(u('root', [u('doctype', {name: 'html'}), h('html', {lang: 'en'}, [])])),
    u('root', {data: {quirksMode: false}}, [
      u('doctype'),
      h('html', {lang: 'en'}, [h('head'), h('body')])
    ]),
    'should pass documents through (#2)'
  )

  t.deepEqual(
    raw(
      u('root', [
        h('img', {alt: 'foo', src: 'bar.jpg'}),
        u('raw', '<img alt="foo" src="bar.jpg">')
      ])
    ),
    u('root', {data: {quirksMode: false}}, [
      h('img', {alt: 'foo', src: 'bar.jpg'}),
      h('img', {alt: 'foo', src: 'bar.jpg'})
    ]),
    'should pass raw nodes through (#1)'
  )

  t.deepEqual(
    raw(u('root', [u('raw', '<p>Foo, bar!'), h('ol', h('li', 'baz'))])),
    u('root', {data: {quirksMode: false}}, [
      h('p', 'Foo, bar!'),
      h('ol', h('li', 'baz'))
    ]),
    'should pass raw nodes through (#2)'
  )

  t.deepEqual(
    raw(
      u('root', [
        h('iframe', {height: 500, src: 'https://ddg.gg'}),
        u('raw', '<img alt="foo" src="bar.jpg">')
      ])
    ),
    u('root', {data: {quirksMode: false}}, [
      h('iframe', {height: 500, src: 'https://ddg.gg'}),
      h('img', {alt: 'foo', src: 'bar.jpg'})
    ]),
    'should pass raw nodes through even after iframe'
  )

  t.deepEqual(
    raw(
      u('root', [
        h('textarea', u('text', 'Some text that is <i>not</i> HTML.')),
        u('raw', '<img alt="foo" src="bar.jpg">')
      ])
    ),
    u('root', {data: {quirksMode: false}}, [
      h('textarea', u('text', 'Some text that is <i>not</i> HTML.')),
      h('img', {alt: 'foo', src: 'bar.jpg'})
    ]),
    'should pass raw nodes through even after textarea (#1)'
  )

  t.deepEqual(
    raw(
      u('root', [
        u('raw', '<textarea>Some text that is <i>not</i> HTML.</textarea>'),
        u('raw', '<img alt="foo" src="bar.jpg">')
      ])
    ),
    u('root', {data: {quirksMode: false}}, [
      h('textarea', u('text', 'Some text that is <i>not</i> HTML.')),
      h('img', {alt: 'foo', src: 'bar.jpg'})
    ]),
    'should pass raw nodes through even after textarea (#2)'
  )

  t.deepEqual(
    raw(
      u('root', [
        u('raw', '<textarea>'),
        u('text', 'Some text that is <i>not</i> HTML.'),
        u('raw', '</textarea>'),
        u('raw', '<p>but this is</p>')
      ])
    ),
    u('root', {data: {quirksMode: false}}, [
      h('textarea', u('text', 'Some text that is <i>not</i> HTML.')),
      h('p', u('text', 'but this is'))
    ]),
    'should pass raw nodes through even after textarea (#3)'
  )

  t.deepEqual(
    raw(u('root', [u('raw', '&#123;and&#125;')])),
    u('root', {data: {quirksMode: false}}, [u('text', '{and}')]),
    'should pass character references through (decimal)'
  )

  t.deepEqual(
    raw(u('root', [u('raw', '&lt;and&gt;')])),
    u('root', {data: {quirksMode: false}}, [u('text', '<and>')]),
    'should pass character references through (named)'
  )

  t.deepEqual(
    raw(u('root', [u('raw', '&#x7b;and&#x7d;')])),
    u('root', {data: {quirksMode: false}}, [u('text', '{and}')]),
    'should pass character references through (hexadecimal)'
  )

  t.deepEqual(
    raw(u('root', [u('raw', '<template>a<b></b>c</template>')])),
    u('root', {data: {quirksMode: false}}, [
      u('element', {
        tagName: 'template',
        properties: {},
        children: [],
        content: u('root', {data: {quirksMode: false}}, [
          u('text', 'a'),
          h('b'),
          u('text', 'c')
        ])
      })
    ]),
    'should support template nodes'
  )

  t.deepEqual(
    raw(u('root', [u('raw', '<i'), h('b')])),
    u('root', {data: {quirksMode: false}}, [h('b')]),
    'should discard broken HTML when a proper element node is found'
  )

  t.deepEqual(
    raw(u('root', [u('raw', '<i'), u('text', 'a')])),
    u('root', {data: {quirksMode: false}}, [u('text', 'a')]),
    'should discard broken HTML when a proper text node is found'
  )

  t.deepEqual(
    raw(u('root', [u('raw', '<i'), u('raw', '>'), h('b')])),
    u('root', {data: {quirksMode: false}}, [h('i', [h('b')])]),
    'should not discard HTML broken over several raw nodes'
  )

  t.deepEqual(
    raw(u('root', [u('customLiteral', 'x')]), {passThrough: ['customLiteral']}),
    u('root', {data: {quirksMode: false}}, [u('customLiteral', 'x')]),
    'should support passing through nodes w/o children'
  )

  t.deepEqual(
    raw(u('root', [u('customParent', [u('raw', '<i>j</i>')])]), {
      passThrough: ['customParent']
    }),
    u('root', {data: {quirksMode: false}}, [u('customParent', [h('i', 'j')])]),
    'should support passing through nodes w/ `raw` children'
  )

  t.deepEqual(
    raw(u('root', [u('customParent', [u('comment', 'x')])]), {
      passThrough: ['customParent']
    }),
    u('root', {data: {quirksMode: false}}, [
      u('customParent', [u('comment', 'x')])
    ]),
    'should support passing through nodes w/ `comment` children'
  )

  t.deepEqual(
    raw(u('root', [u('customParent', [])]), {
      passThrough: ['customParent']
    }),
    u('root', {data: {quirksMode: false}}, [u('customParent', [])]),
    'should support passing through nodes w/ `0` children'
  )

  t.deepEqual(
    raw(u('root', [u('customParent', [u('raw', '<x')])]), {
      passThrough: ['customParent']
    }),
    u('root', {data: {quirksMode: false}}, [u('customParent', [])]),
    'should support passing through nodes w/ broken raw children (1)'
  )

  t.deepEqual(
    raw(u('root', [u('customParent', [u('raw', '<x>')])]), {
      passThrough: ['customParent']
    }),
    u('root', {data: {quirksMode: false}}, [u('customParent', [h('x')])]),
    'should support passing through nodes w/ broken raw children (2)'
  )

  t.deepEqual(
    raw(u('root', [u('customParent', [u('raw', '</x>')])]), {
      passThrough: ['customParent']
    }),
    u('root', {data: {quirksMode: false}}, [u('customParent', [])]),
    'should support passing through nodes w/ broken raw children (3)'
  )

  t.deepEqual(
    raw(u('root', [u('customParent', [u('raw', '<x>')]), u('raw', '</x>')]), {
      passThrough: ['customParent']
    }),
    u('root', {data: {quirksMode: false}}, [u('customParent', [h('x')])]),
    'should support passing through nodes w/ broken raw children (4)'
  )

  t.deepEqual(
    raw(u('root', [u('raw', '<script>alert(1)</script>')])),
    u('root', {data: {quirksMode: false}}, [
      h('script', u('text', 'alert(1)'))
    ]),
    'security: raw nodes (unsafe)'
  )

  t.deepEqual(
    raw(u('root', [h('script', u('text', 'alert(1)'))])),
    u('root', {data: {quirksMode: false}}, [
      h('script', u('text', 'alert(1)'))
    ]),
    'security: unsafe nodes (unsafe)'
  )

  t.end()
})

test('integration', (t) => {
  unified()
    .use(remarkParse)
    .use(remarkRehype, {allowDangerousHtml: true})
    .use(
      /** @type {import('unified').Plugin<[], Root, Root>} */
      // @ts-expect-error: assume a given root yields a root.
      () => (tree, file) => raw(tree, file)
    )
    .use(() => (tree) => {
      t.deepEqual(
        tree,
        {
          type: 'root',
          children: [
            {
              type: 'element',
              tagName: 'p',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'i',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'Some title',
                      position: {
                        start: {line: 1, column: 4, offset: 3},
                        end: {line: 1, column: 14, offset: 13}
                      }
                    }
                  ],
                  position: {
                    start: {line: 1, column: 1, offset: 0},
                    end: {line: 1, column: 18, offset: 17}
                  }
                }
              ],
              position: {
                start: {line: 1, column: 1, offset: 0},
                end: {line: 1, column: 18, offset: 17}
              }
            },
            {type: 'text', value: '\n'},
            {
              type: 'element',
              tagName: 'p',
              properties: {},
              children: [
                {
                  type: 'text',
                  value: 'Hello, world!\n',
                  position: {
                    start: {line: 3, column: 4, offset: 22},
                    end: null
                  }
                }
              ],
              position: {
                start: {line: 3, column: 1, offset: 19},
                end: {line: 5, column: 1, offset: 37}
              }
            },
            {
              type: 'element',
              tagName: 'ul',
              properties: {},
              children: [
                {type: 'text', value: '\n'},
                {
                  type: 'element',
                  tagName: 'li',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'This',
                      position: {
                        start: {line: 5, column: 5, offset: 41},
                        end: {line: 5, column: 9, offset: 45}
                      }
                    }
                  ],
                  position: {
                    start: {line: 5, column: 1, offset: 37},
                    end: {line: 5, column: 9, offset: 45}
                  }
                },
                {type: 'text', value: '\n'},
                {
                  type: 'element',
                  tagName: 'li',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'Is',
                      position: {
                        start: {line: 6, column: 5, offset: 50},
                        end: {line: 6, column: 7, offset: 52}
                      }
                    }
                  ],
                  position: {
                    start: {line: 6, column: 1, offset: 46},
                    end: {line: 6, column: 7, offset: 52}
                  }
                },
                {type: 'text', value: '\n'},
                {
                  type: 'element',
                  tagName: 'li',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'A',
                      position: {
                        start: {line: 7, column: 5, offset: 57},
                        end: {line: 7, column: 6, offset: 58}
                      }
                    }
                  ],
                  position: {
                    start: {line: 7, column: 1, offset: 53},
                    end: {line: 7, column: 6, offset: 58}
                  }
                },
                {type: 'text', value: '\n'},
                {
                  type: 'element',
                  tagName: 'li',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'List',
                      position: {
                        start: {line: 8, column: 5, offset: 63},
                        end: {line: 8, column: 9, offset: 67}
                      }
                    }
                  ],
                  position: {
                    start: {line: 8, column: 1, offset: 59},
                    end: {line: 8, column: 9, offset: 67}
                  }
                },
                {type: 'text', value: '\n'}
              ],
              position: {
                start: {line: 5, column: 1, offset: 37},
                end: {line: 8, column: 9, offset: 67}
              }
            },
            {type: 'text', value: '\n'},
            {
              type: 'element',
              tagName: 'p',
              properties: {},
              children: [
                {
                  type: 'text',
                  value: 'A mix of ',
                  position: {
                    start: {line: 10, column: 1, offset: 69},
                    end: {line: 10, column: 10, offset: 78}
                  }
                },
                {
                  type: 'element',
                  tagName: 'em',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'markdown',
                      position: {
                        start: {line: 10, column: 11, offset: 79},
                        end: {line: 10, column: 19, offset: 87}
                      }
                    }
                  ],
                  position: {
                    start: {line: 10, column: 10, offset: 78},
                    end: {line: 10, column: 20, offset: 88}
                  }
                },
                {
                  type: 'text',
                  value: ' and ',
                  position: {
                    start: {line: 10, column: 20, offset: 88},
                    end: {line: 10, column: 25, offset: 93}
                  }
                },
                {
                  type: 'element',
                  tagName: 'em',
                  properties: {},
                  children: [
                    {
                      type: 'text',
                      value: 'HTML',
                      position: {
                        start: {line: 10, column: 29, offset: 97},
                        end: {line: 10, column: 33, offset: 101}
                      }
                    }
                  ],
                  position: {
                    start: {line: 10, column: 25, offset: 93},
                    end: {line: 10, column: 38, offset: 106}
                  }
                },
                {
                  type: 'text',
                  value: '.',
                  position: {
                    start: {line: 10, column: 38, offset: 106},
                    end: {line: 10, column: 39, offset: 107}
                  }
                }
              ],
              position: {
                start: {line: 10, column: 1, offset: 69},
                end: {line: 10, column: 39, offset: 107}
              }
            },
            {type: 'text', value: '\n'},
            {
              type: 'element',
              tagName: 'hr',
              properties: {},
              children: [],
              position: {
                start: {line: 12, column: 1, offset: 109},
                end: {line: 12, column: 4, offset: 112}
              }
            },
            {type: 'text', value: '\n'},
            {
              type: 'element',
              tagName: 'p',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'img',
                  properties: {
                    src: 'https://example.com/favicon.ico',
                    alt: 'an image',
                    title: 'title'
                  },
                  children: [],
                  position: {
                    start: {line: 14, column: 1, offset: 114},
                    end: {line: 14, column: 53, offset: 166}
                  }
                }
              ],
              position: {
                start: {line: 14, column: 1, offset: 114},
                end: {line: 14, column: 53, offset: 166}
              }
            },
            {type: 'text', value: '\n'},
            {
              type: 'element',
              tagName: 'p',
              properties: {},
              children: [
                {
                  type: 'element',
                  tagName: 'svg',
                  properties: {},
                  children: [
                    {
                      type: 'element',
                      tagName: 'rect',
                      properties: {},
                      children: [],
                      position: {
                        start: {line: 16, column: 6, offset: 173},
                        end: {line: 16, column: 13, offset: 180}
                      }
                    }
                  ],
                  position: {
                    start: {line: 16, column: 1, offset: 168},
                    end: {line: 16, column: 19, offset: 186}
                  }
                }
              ],
              position: {
                start: {line: 16, column: 1, offset: 168},
                end: {line: 16, column: 19, offset: 186}
              }
            },
            {type: 'text', value: '\n'},
            {
              type: 'element',
              tagName: 'div',
              properties: {id: 'foo', className: ['bar', 'baz']},
              children: [
                {
                  type: 'element',
                  tagName: 'img',
                  properties: {src: 'a', alt: 'bar'},
                  children: [],
                  position: {
                    start: {line: 18, column: 31, offset: 218},
                    end: {line: 18, column: 52, offset: 239}
                  }
                },
                {
                  type: 'text',
                  value: 'alfred',
                  position: {
                    start: {line: 18, column: 52, offset: 239},
                    end: {line: 18, column: 58, offset: 245}
                  }
                }
              ],
              position: {
                start: {line: 18, column: 1, offset: 188},
                end: {line: 18, column: 64, offset: 251}
              }
            },
            {type: 'text', value: '\n'},
            {
              type: 'element',
              tagName: 'p',
              properties: {},
              children: [
                {
                  type: 'text',
                  value: 'Hello, world!',
                  position: {
                    start: {line: 20, column: 4, offset: 256},
                    end: {line: 20, column: 17, offset: 270}
                  }
                }
              ],
              position: {
                start: {line: 20, column: 1, offset: 253},
                end: {line: 20, column: 17, offset: 270}
              }
            }
          ],
          data: {quirksMode: false},
          position: {
            start: {line: 1, column: 1, offset: 0},
            end: {line: 21, column: 1, offset: 270}
          }
        },
        'should equal the fixture tree'
      )
    })
    .use(rehypeStringify)
    .process(
      [
        '<i>Some title</i>',
        '',
        '<p>Hello, world!',
        '',
        '*   This',
        '*   Is',
        '*   A',
        '*   List',
        '',
        'A mix of *markdown* and <em>HTML</em>.',
        '',
        '***',
        '',
        '![an image](https://example.com/favicon.ico "title")',
        '',
        '<svg><rect/></svg>',
        '',
        '<div id="foo" class="bar baz"><img src="a" alt=bar>alfred</div>',
        '',
        '<p>Hello, world!',
        ''
      ].join('\n'),
      (error, file) => {
        t.ifErr(error, 'should not fail')

        t.equal(
          String(file),
          [
            '<p><i>Some title</i></p>',
            '<p>Hello, world!',
            '</p><ul>',
            '<li>This</li>',
            '<li>Is</li>',
            '<li>A</li>',
            '<li>List</li>',
            '</ul>',
            '<p>A mix of <em>markdown</em> and <em>HTML</em>.</p>',
            '<hr>',
            '<p><img src="https://example.com/favicon.ico" alt="an image" title="title"></p>',
            '<p><svg><rect></rect></svg></p>',
            '<div id="foo" class="bar baz"><img src="a" alt="bar">alfred</div>',
            '<p>Hello, world!</p>'
          ].join('\n'),
          'should equal the fixture'
        )
      }
    )

  t.end()
})

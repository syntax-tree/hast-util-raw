/**
 * @import {} from './test-types.js'
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import {h, s} from 'hastscript'
import {raw} from 'hast-util-raw'
import {toHtml} from 'hast-util-to-html'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {toHast} from 'mdast-util-to-hast'
import {VFile} from 'vfile'

test('raw', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('hast-util-raw')).sort(), ['raw'])
  })

  await t.test('should throw for unknown nodes', async function () {
    assert.throws(function () {
      raw({type: 'root', children: [{type: 'customLiteral', value: ''}]})
    }, /^Error: Cannot compile `customLiteral` node$/)
  })

  await t.test('should throw for unknown nodes', async function () {
    assert.throws(function () {
      raw({type: 'root', children: [{type: 'mdxjsEsm', value: ''}]})
    }, /^Error: Cannot compile `mdxjsEsm` node. It looks like you are using MDX nodes/)
  })

  await t.test('should pass elements through', async function () {
    assert.deepEqual(raw(h('#foo.bar', 'baz')), h('#foo.bar', 'baz'))
  })

  await t.test('should pass void elements through', async function () {
    assert.deepEqual(
      raw(h('img', {alt: 'foo', src: 'bar.jpg'})),
      h('img', {alt: 'foo', src: 'bar.jpg'})
    )
  })

  await t.test('should pass roots through', async function () {
    assert.deepEqual(raw({type: 'root', children: [h('#foo.bar', 'baz')]}), {
      type: 'root',
      data: {quirksMode: false},
      children: [h('#foo.bar', 'baz')]
    })
  })

  await t.test('should pass empty root’s through', async function () {
    assert.deepEqual(raw({type: 'root', children: []}), {
      type: 'root',
      data: {quirksMode: false},
      children: []
    })
  })

  await t.test('should pass texts through', async function () {
    assert.deepEqual(raw({type: 'text', value: 'foo'}), {
      type: 'text',
      value: 'foo'
    })
  })

  await t.test('should pass comments through', async function () {
    assert.deepEqual(raw({type: 'comment', value: 'foo'}), {
      type: 'comment',
      value: 'foo'
    })
  })

  await t.test('should pass documents through (#1)', async function () {
    assert.deepEqual(
      raw(h('html', {lang: 'en'})),
      h('html', {lang: 'en'}, [h('head'), h('body')])
    )
  })

  await t.test('should pass documents through (#2)', async function () {
    assert.deepEqual(
      raw({
        type: 'root',
        children: [{type: 'doctype'}, h('html', {lang: 'en'}, [])]
      }),
      {
        type: 'root',
        data: {quirksMode: false},
        children: [
          {type: 'doctype'},
          h('html', {lang: 'en'}, [h('head'), h('body')])
        ]
      }
    )
  })

  await t.test('should pass raw nodes through (#1)', async function () {
    assert.deepEqual(
      raw({
        type: 'root',
        children: [
          h('img', {alt: 'foo', src: 'bar.jpg'}),
          {type: 'raw', value: '<img alt="foo" src="bar.jpg">'}
        ]
      }),
      {
        type: 'root',
        data: {quirksMode: false},
        children: [
          h('img', {alt: 'foo', src: 'bar.jpg'}),
          h('img', {alt: 'foo', src: 'bar.jpg'})
        ]
      }
    )
  })

  await t.test('should pass raw nodes through (#2)', async function () {
    assert.deepEqual(
      raw({
        type: 'root',
        children: [
          {type: 'raw', value: '<p>Foo, bar!'},
          h('ol', h('li', 'baz'))
        ]
      }),
      {
        type: 'root',
        data: {quirksMode: false},
        children: [h('p', 'Foo, bar!'), h('ol', h('li', 'baz'))]
      }
    )
  })

  await t.test(
    'should pass raw nodes through even after iframe',
    async function () {
      assert.deepEqual(
        raw({
          type: 'root',
          children: [
            h('iframe', {height: 500, src: 'https://ddg.gg'}),
            {type: 'raw', value: '<img alt="foo" src="bar.jpg">'}
          ]
        }),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [
            h('iframe', {height: 500, src: 'https://ddg.gg'}),
            h('img', {alt: 'foo', src: 'bar.jpg'})
          ]
        }
      )
    }
  )

  await t.test(
    'should pass raw nodes through even after textarea (#1)',
    async function () {
      assert.deepEqual(
        raw({
          type: 'root',
          children: [
            h('textarea', [
              {type: 'text', value: 'Some text that is <i>not</i> HTML.'}
            ]),
            {type: 'raw', value: '<img alt="foo" src="bar.jpg">'}
          ]
        }),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [
            h('textarea', [
              {type: 'text', value: 'Some text that is <i>not</i> HTML.'}
            ]),
            h('img', {alt: 'foo', src: 'bar.jpg'})
          ]
        }
      )
    }
  )

  await t.test(
    'should pass raw nodes through even after textarea (#2)',
    async function () {
      assert.deepEqual(
        raw({
          type: 'root',
          children: [
            {
              type: 'raw',
              value: '<textarea>Some text that is <i>not</i> HTML.</textarea>'
            },
            {type: 'raw', value: '<img alt="foo" src="bar.jpg">'}
          ]
        }),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [
            h('textarea', [
              {type: 'text', value: 'Some text that is <i>not</i> HTML.'}
            ]),
            h('img', {alt: 'foo', src: 'bar.jpg'})
          ]
        }
      )
    }
  )

  await t.test(
    'should pass raw nodes through even after textarea (#3)',
    async function () {
      assert.deepEqual(
        raw({
          type: 'root',
          children: [
            {type: 'raw', value: '<textarea>'},
            {type: 'text', value: 'Some text that is <i>not</i> HTML.'},
            {type: 'raw', value: '</textarea>'},
            {type: 'raw', value: '<p>but this is</p>'}
          ]
        }),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [
            h('textarea', [
              {type: 'text', value: 'Some text that is <i>not</i> HTML.'}
            ]),
            h('p', [{type: 'text', value: 'but this is'}])
          ]
        }
      )
    }
  )

  await t.test(
    'should pass character references through (decimal)',
    async function () {
      assert.deepEqual(
        raw({
          type: 'root',
          children: [{type: 'raw', value: '&#123;and&#125;'}]
        }),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [{type: 'text', value: '{and}'}]
        }
      )
    }
  )

  await t.test(
    'should pass character references through (named)',
    async function () {
      assert.deepEqual(
        raw({type: 'root', children: [{type: 'raw', value: '&lt;and&gt;'}]}),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [{type: 'text', value: '<and>'}]
        }
      )
    }
  )

  await t.test(
    'should pass character references through (hexadecimal)',
    async function () {
      assert.deepEqual(
        raw({
          type: 'root',
          children: [{type: 'raw', value: '&#x7b;and&#x7d;'}]
        }),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [{type: 'text', value: '{and}'}]
        }
      )
    }
  )

  await t.test('should support template nodes', async function () {
    assert.deepEqual(
      raw({
        type: 'root',
        children: [{type: 'raw', value: '<template>a<b></b>c</template>'}]
      }),
      {
        type: 'root',
        data: {quirksMode: false},
        children: [
          {
            type: 'element',
            tagName: 'template',
            properties: {},
            children: [],
            content: {
              type: 'root',
              data: {quirksMode: false},
              children: [
                {type: 'text', value: 'a'},
                h('b'),
                {type: 'text', value: 'c'}
              ]
            }
          }
        ]
      }
    )
  })

  await t.test('should support HTML in SVG in HTML', async function () {
    assert.deepEqual(
      raw({
        type: 'root',
        children: [h('p', [h('svg', [s('foreignObject', [h('div')])])])]
      }),
      {
        type: 'root',
        data: {quirksMode: false},
        children: [h('p', [h('svg', [s('foreignObject', [h('div')])])])]
      }
    )
  })

  await t.test('should support camelcased SVG elements', async function () {
    assert.deepEqual(
      raw(
        s(undefined, [
          s('svg', [
            s('circle'),
            s('rect'),
            s('linearGradient'),
            s('path'),
            s('g')
          ])
        ])
      ),
      {
        type: 'root',
        children: [
          s('svg', [
            s('circle'),
            s('rect'),
            s('linearGradient'),
            s('path'),
            s('g')
          ])
        ],
        data: {quirksMode: false}
      }
    )
  })

  await t.test(
    'should discard broken HTML when a proper element node is found',
    async function () {
      assert.deepEqual(
        raw({type: 'root', children: [{type: 'raw', value: '<i'}, h('b')]}),
        {type: 'root', data: {quirksMode: false}, children: [h('b')]}
      )
    }
  )

  await t.test(
    'should discard broken HTML when a proper text node is found',
    async function () {
      assert.deepEqual(
        raw({
          type: 'root',
          children: [
            {type: 'raw', value: '<i'},
            {type: 'text', value: 'a'}
          ]
        }),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [{type: 'text', value: 'a'}]
        }
      )
    }
  )

  await t.test(
    'should not discard HTML broken over several raw nodes',
    async function () {
      assert.deepEqual(
        raw({
          type: 'root',
          children: [
            {type: 'raw', value: '<i'},
            {type: 'raw', value: '>'},
            h('b')
          ]
        }),
        {type: 'root', data: {quirksMode: false}, children: [h('i', [h('b')])]}
      )
    }
  )

  await t.test(
    'should support passing through nodes w/o children',
    async function () {
      assert.deepEqual(
        raw(
          {type: 'root', children: [{type: 'customLiteral', value: 'x'}]},
          {
            passThrough: ['customLiteral']
          }
        ),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [{type: 'customLiteral', value: 'x'}]
        }
      )
    }
  )

  await t.test(
    'should support passing through nodes w/ `raw` children',
    async function () {
      assert.deepEqual(
        raw(
          {
            type: 'root',
            children: [
              {
                type: 'customParent',
                children: [{type: 'raw', value: '<i>j</i>'}]
              }
            ]
          },
          {
            passThrough: ['customParent']
          }
        ),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [{type: 'customParent', children: [h('i', 'j')]}]
        }
      )
    }
  )

  await t.test(
    'should support passing through nodes w/ `comment` children',
    async function () {
      assert.deepEqual(
        raw(
          {
            type: 'root',
            children: [
              {type: 'customParent', children: [{type: 'comment', value: 'x'}]}
            ]
          },
          {
            passThrough: ['customParent']
          }
        ),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [
            {type: 'customParent', children: [{type: 'comment', value: 'x'}]}
          ]
        }
      )
    }
  )

  await t.test(
    'should support passing through nodes w/ `0` children',
    async function () {
      assert.deepEqual(
        raw(
          {type: 'root', children: [{type: 'customParent', children: []}]},
          {
            passThrough: ['customParent']
          }
        ),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [{type: 'customParent', children: []}]
        }
      )
    }
  )

  await t.test(
    'should support passing through nodes w/ broken raw children (1)',
    async function () {
      assert.deepEqual(
        raw(
          {
            type: 'root',
            children: [
              {type: 'customParent', children: [{type: 'raw', value: '<x'}]}
            ]
          },
          {
            passThrough: ['customParent']
          }
        ),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [{type: 'customParent', children: []}]
        }
      )
    }
  )

  await t.test(
    'should support passing through nodes w/ broken raw children (2)',
    async function () {
      assert.deepEqual(
        raw(
          {
            type: 'root',
            children: [
              {type: 'customParent', children: [{type: 'raw', value: '<x>'}]}
            ]
          },
          {
            passThrough: ['customParent']
          }
        ),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [{type: 'customParent', children: [h('x')]}]
        }
      )
    }
  )

  await t.test(
    'should support passing through nodes w/ broken raw children (3)',
    async function () {
      assert.deepEqual(
        raw(
          {
            type: 'root',
            children: [
              {type: 'customParent', children: [{type: 'raw', value: '</x>'}]}
            ]
          },
          {
            passThrough: ['customParent']
          }
        ),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [{type: 'customParent', children: []}]
        }
      )
    }
  )

  await t.test(
    'should support passing through nodes w/ broken raw children (4)',
    async function () {
      assert.deepEqual(
        raw(
          {
            type: 'root',
            children: [
              {type: 'customParent', children: [{type: 'raw', value: '<x>'}]},
              {type: 'raw', value: '</x>'}
            ]
          },
          {
            passThrough: ['customParent']
          }
        ),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [{type: 'customParent', children: [h('x')]}]
        }
      )
    }
  )

  await t.test(
    'should support raw text and then another raw node',
    async function () {
      assert.deepEqual(
        raw({
          type: 'root',
          children: [
            {type: 'raw', value: 'aaa'},
            {type: 'raw', value: '<x>'}
          ]
        }),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [{type: 'text', value: 'aaa'}, h('x')]
        }
      )
    }
  )

  await t.test('should switch to data state at a text node', async function () {
    assert.deepEqual(
      raw({
        type: 'root',
        children: [
          {type: 'raw', value: '<details>\n<summary>Complete logs</summary'},
          {type: 'text', value: '\n'},
          {type: 'raw', value: '</details>'}
        ]
      }),
      {
        type: 'root',
        data: {quirksMode: false},
        children: [
          {
            type: 'element',
            tagName: 'details',
            properties: {},
            children: [
              {type: 'text', value: '\n'},
              {
                type: 'element',
                tagName: 'summary',
                properties: {},
                children: [{type: 'text', value: 'Complete logs\n'}]
              }
            ]
          }
        ]
      }
    )
  })

  await t.test(
    'should support raw nodes (security, unsafe)',
    async function () {
      assert.deepEqual(
        raw({
          type: 'root',
          children: [{type: 'raw', value: '<script>alert(1)</script>'}]
        }),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [h('script', [{type: 'text', value: 'alert(1)'}])]
        }
      )
    }
  )

  await t.test(
    'should support unsafe nodes (security, unsafe)',
    async function () {
      assert.deepEqual(
        raw({
          type: 'root',
          children: [h('script', [{type: 'text', value: 'alert(1)'}])]
        }),
        {
          type: 'root',
          data: {quirksMode: false},
          children: [h('script', [{type: 'text', value: 'alert(1)'}])]
        }
      )
    }
  )

  await t.test('rcdata (`<textarea>`, `<title>`)', async function (t) {
    await t.test(
      'should support text after a raw rcdata opening tag',
      async function () {
        assert.deepEqual(
          raw(h(null, ['a ', {type: 'raw', value: '<title>'}, ' b.'])),
          {
            type: 'root',
            children: [{type: 'text', value: 'a '}, h('title', ' b.')],
            data: {quirksMode: false}
          }
        )
      }
    )

    await t.test(
      'should ignore an element after a raw rcdata opening tag',
      async function () {
        assert.deepEqual(
          raw(h(null, ['a ', {type: 'raw', value: '<title>'}, h('b')])),
          {
            type: 'root',
            children: [{type: 'text', value: 'a '}, h('title')],
            data: {quirksMode: false}
          }
        )
      }
    )

    await t.test(
      'should ignore a mismatched rcdata closing tag after a raw rcdata opening tag',
      async function () {
        assert.deepEqual(
          raw(
            h(null, [
              'a ',
              {type: 'raw', value: '<title>'},
              ' b ',
              {type: 'raw', value: '</textarea>'}
            ])
          ),
          {
            type: 'root',
            children: [{type: 'text', value: 'a '}, h('title', ' b ')],
            data: {quirksMode: false}
          }
        )
      }
    )

    await t.test(
      'should support a matched rcdata closing tag after a raw rcdata opening tag',
      async function () {
        assert.deepEqual(
          raw(
            h(null, [
              'a ',
              {type: 'raw', value: '<title>'},
              ' b ',
              {type: 'raw', value: '</title>'},
              ' c.'
            ])
          ),
          {
            type: 'root',
            children: [
              {type: 'text', value: 'a '},
              h('title', ' b '),
              {type: 'text', value: ' c.'}
            ],
            data: {quirksMode: false}
          }
        )
      }
    )
  })

  await t.test(
    'rawtext (`<iframe>`, `<noembed>`, `<style>`, `<xmp>`)',
    async function (t) {
      await t.test(
        'should support text after a raw rawtext opening tag',
        async function () {
          assert.deepEqual(
            raw(h(null, ['a ', {type: 'raw', value: '<iframe>'}, ' b.'])),
            {
              type: 'root',
              children: [{type: 'text', value: 'a '}, h('iframe', ' b.')],
              data: {quirksMode: false}
            }
          )
        }
      )

      await t.test(
        'should ignore an element after a raw rawtext opening tag',
        async function () {
          assert.deepEqual(
            raw(h(null, ['a ', {type: 'raw', value: '<iframe>'}, h('b')])),
            {
              type: 'root',
              children: [{type: 'text', value: 'a '}, h('iframe')],
              data: {quirksMode: false}
            }
          )
        }
      )

      await t.test(
        'should ignore a mismatched rawtext closing tag after a raw rawtext opening tag',
        async function () {
          assert.deepEqual(
            raw(
              h(null, [
                'a ',
                {type: 'raw', value: '<iframe>'},
                ' b ',
                {type: 'raw', value: '</style>'}
              ])
            ),
            {
              type: 'root',
              children: [{type: 'text', value: 'a '}, h('iframe', ' b ')],
              data: {quirksMode: false}
            }
          )
        }
      )

      await t.test(
        'should support a matched rawtext closing tag after a raw rawtext opening tag',
        async function () {
          assert.deepEqual(
            raw(
              h(null, [
                'a ',
                {type: 'raw', value: '<iframe>'},
                ' b ',
                {type: 'raw', value: '</iframe>'},
                ' c.'
              ])
            ),
            {
              type: 'root',
              children: [
                {type: 'text', value: 'a '},
                h('iframe', ' b '),
                {type: 'text', value: ' c.'}
              ],
              data: {quirksMode: false}
            }
          )
        }
      )
    }
  )

  await t.test('script data (`<script>`)', async function (t) {
    await t.test(
      'should support text after a raw script data opening tag',
      async function () {
        assert.deepEqual(
          raw(h(null, ['a ', {type: 'raw', value: '<script>'}, ' b.'])),
          {
            type: 'root',
            children: [{type: 'text', value: 'a '}, h('script', ' b.')],
            data: {quirksMode: false}
          }
        )
      }
    )

    await t.test(
      'should ignore an element after a raw script data opening tag',
      async function () {
        assert.deepEqual(
          raw(h(null, ['a ', {type: 'raw', value: '<script>'}, h('b')])),
          {
            type: 'root',
            children: [{type: 'text', value: 'a '}, h('script')],
            data: {quirksMode: false}
          }
        )
      }
    )

    await t.test(
      'should support a matched script data closing tag after a raw script data opening tag',
      async function () {
        assert.deepEqual(
          raw(
            h(null, [
              'a ',
              {type: 'raw', value: '<script>'},
              ' b ',
              {type: 'raw', value: '</script>'},
              ' c.'
            ])
          ),
          {
            type: 'root',
            children: [
              {type: 'text', value: 'a '},
              h('script', ' b '),
              {type: 'text', value: ' c.'}
            ],
            data: {quirksMode: false}
          }
        )
      }
    )
  })

  await t.test('plain text (`<plaintext>`)', async function (t) {
    await t.test(
      'should support text after a raw plaintext opening tag',
      async function () {
        assert.deepEqual(
          raw(h(null, ['a ', {type: 'raw', value: '<plaintext>'}, ' b.'])),
          {
            type: 'root',
            children: [{type: 'text', value: 'a '}, h('plaintext', ' b.')],
            data: {quirksMode: false}
          }
        )
      }
    )

    await t.test(
      'should ignore an element after a raw plaintext opening tag',
      async function () {
        assert.deepEqual(
          raw(h(null, ['a ', {type: 'raw', value: '<plaintext>'}, h('b')])),
          {
            type: 'root',
            children: [{type: 'text', value: 'a '}, h('plaintext')],
            data: {quirksMode: false}
          }
        )
      }
    )

    await t.test(
      'should support a matched plaintext closing tag after a raw plaintext opening tag',
      async function () {
        assert.deepEqual(
          raw(
            h(null, [
              'a ',
              {type: 'raw', value: '<plaintext>'},
              ' b ',
              {type: 'raw', value: '</plaintext>'},
              ' c.'
            ])
          ),
          {
            type: 'root',
            children: [{type: 'text', value: 'a '}, h('plaintext', ' b  c.')],
            data: {quirksMode: false}
          }
        )
      }
    )
  })

  await t.test('tagfilter', async function (t) {
    await t.test('should filter tags', async function () {
      const result = raw(
        {
          type: 'root',
          children: [
            h('p', [{type: 'raw', value: '<strong> <title> <style> <em>'}]),
            {type: 'text', value: '\n'},
            {
              type: 'raw',
              value:
                '<blockquote>\n  <xmp> is disallowed.  <XMP> is also disallowed.\n</blockquote>'
            }
          ]
        },
        {tagfilter: true}
      )

      assert.deepEqual(result, {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'strong',
                properties: {},
                children: [
                  {type: 'text', value: ' <title> <style> '},
                  {
                    type: 'element',
                    tagName: 'em',
                    properties: {},
                    children: []
                  }
                ]
              }
            ]
          },
          {
            type: 'element',
            tagName: 'strong',
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'em',
                properties: {},
                children: [
                  {type: 'text', value: '\n'},
                  {
                    type: 'element',
                    tagName: 'blockquote',
                    properties: {},
                    children: [
                      {
                        type: 'text',
                        value:
                          '\n  <xmp> is disallowed.  <XMP> is also disallowed.\n'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ],
        data: {quirksMode: false}
      })
    })
  })
})

test('integration', async function (t) {
  await t.test(
    'should work together with the mdast -> hast utilities',
    async function () {
      const document = [
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
      ].join('\n')

      const expected = {
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
                  end: undefined
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
                  end: {line: 20, column: 17, offset: 269}
                }
              }
            ],
            position: {
              start: {line: 20, column: 1, offset: 253},
              end: {line: 20, column: 17, offset: 269}
            }
          }
        ],
        data: {quirksMode: false},
        position: {
          start: {line: 1, column: 1, offset: 0},
          end: {line: 21, column: 1, offset: 270}
        }
      }

      const mdast = fromMarkdown(document)
      const hast = toHast(mdast, {allowDangerousHtml: true})
      const hast2 = raw(hast, {file: new VFile(document)})

      assert.deepEqual(hast2, expected)

      assert.equal(
        toHtml(hast2),
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
        ].join('\n')
      )
    }
  )
})

'use strict';

/* Dependencies. */
var test = require('tape');
var u = require('unist-builder');
var h = require('hastscript');
var unified = require('unified');
var parse = require('remark-parse');
var remark2rehype = require('remark-rehype');
var stringify = require('rehype-stringify');
var raw = require('./');

/* Tests. */
test('raw', function (t) {
  t.throws(
    function () {
      raw(u('unknown'));
    },
    /^Error: Cannot compile `unknown` node$/,
    'should throw for unknown nodes'
  );

  t.deepEqual(
    raw(h('#foo.bar', 'baz')),
    h('#foo.bar', 'baz'),
    'should pass elements through'
  );

  t.deepEqual(
    raw(h('img', {alt: 'foo', src: 'bar.jpg'})),
    h('img', {alt: 'foo', src: 'bar.jpg'}),
    'should pass void elements through'
  );

  t.deepEqual(
    raw(u('root', [h('#foo.bar', 'baz')])),
    u('root', {data: {quirksMode: undefined}}, [h('#foo.bar', 'baz')]),
    'should pass roots through'
  );

  t.deepEqual(
    raw(u('root', [])),
    u('root', {data: {quirksMode: undefined}}, []),
    'should pass empty root’s through'
  );

  t.deepEqual(
    raw(u('text', 'foo')),
    u('text', 'foo'),
    'should pass texts through'
  );

  t.deepEqual(
    raw(u('comment', 'foo')),
    u('comment', 'foo'),
    'should pass comments through'
  );

  t.deepEqual(
    raw(h('html', {lang: 'en'})),
    h('html', {lang: 'en'}, [
      h('head'),
      h('body')
    ]),
    'should pass documents through'
  );

  t.deepEqual(
    raw(u('root', [
      u('doctype', {name: 'html'}),
      h('html', {lang: 'en'}, [])
    ])),
    u('root', {data: {quirksMode: undefined}}, [
      u('doctype', {name: 'html', public: null, system: null}),
      h('html', {lang: 'en'}, [
        h('head'),
        h('body')
      ])
    ]),
    'should pass documents through'
  );

  t.deepEqual(
    raw(u('root', [
      h('img', {alt: 'foo', src: 'bar.jpg'}),
      u('raw', '<img alt="foo" src="bar.jpg">')
    ])),
    u('root', {data: {quirksMode: undefined}}, [
      h('img', {alt: 'foo', src: 'bar.jpg'}),
      h('img', {alt: 'foo', src: 'bar.jpg'})
    ]),
    'should pass raw nodes through'
  );

  t.deepEqual(
    raw(u('root', [
      u('raw', '<p>Foo, bar!'),
      h('ol', h('li', 'baz'))
    ])),
    u('root', {data: {quirksMode: undefined}}, [
      h('p', 'Foo, bar!'),
      h('ol', h('li', 'baz'))
    ]),
    'should pass raw nodes through'
  );

  t.end();
});

/* Tests. */
test('integration', function (t) {
  unified()
    .use(parse)
    .use(remark2rehype, {allowDangerousHTML: true})
    .use(function () {
      return raw;
    })
    .use(function () {
      return transformer;
      function transformer(tree) {
        t.deepEqual(
          tree,
          {
            type: 'root',
            children: [
              {
                type: 'element',
                tagName: 'p',
                properties: {},
                children: [{
                  type: 'element',
                  tagName: 'i',
                  properties: {},
                  children: [{
                    type: 'text',
                    value: 'Some title',
                    position: {
                      start: {line: 1, column: 4, offset: 3},
                      end: {line: 1, column: 14, offset: 13}
                    }
                  }],
                  position: {
                    start: {line: 1, column: 1, offset: 0},
                    end: {line: 1, column: 18, offset: 17}
                  }
                }],
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
                children: [{
                  type: 'text',
                  value: 'Hello, world!\n',
                  position: {
                    start: {line: 3, column: 4, offset: 22},
                    end: null
                  }
                }],
                position: {
                  start: {line: 3, column: 1, offset: 19},
                  end: null
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
                    children: [{
                      type: 'text',
                      value: 'This',
                      position: {
                        start: {line: 5, column: 5, offset: 41},
                        end: {line: 5, column: 9, offset: 45}
                      }
                    }],
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
                    children: [{
                      type: 'text',
                      value: 'Is',
                      position: {
                        start: {line: 6, column: 5, offset: 50},
                        end: {line: 6, column: 7, offset: 52}
                      }
                    }],
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
                    children: [{
                      type: 'text',
                      value: 'A',
                      position: {
                        start: {line: 7, column: 5, offset: 57},
                        end: {line: 7, column: 6, offset: 58}
                      }
                    }],
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
                    children: [{
                      type: 'text',
                      value: 'List',
                      position: {
                        start: {line: 8, column: 5, offset: 63},
                        end: {line: 8, column: 9, offset: 67}
                      }
                    }],
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
                    children: [{
                      type: 'text',
                      value: 'markdown',
                      position: {
                        start: {line: 10, column: 11, offset: 79},
                        end: {line: 10, column: 19, offset: 87}
                      }
                    }],
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
                    children: [{
                      type: 'text',
                      value: 'HTML',
                      position: {
                        start: {line: 10, column: 29, offset: 97},
                        end: {line: 10, column: 33, offset: 101}
                      }
                    }],
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
                children: [{
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
                }],
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
                children: [{
                  type: 'element',
                  tagName: 'svg',
                  properties: {},
                  children: [{
                    type: 'element',
                    tagName: 'rect',
                    properties: {},
                    children: [],
                    position: {
                      start: {line: 16, column: 6, offset: 173},
                      end: {line: 16, column: 13, offset: 180}
                    }
                  }],
                  position: {
                    start: {line: 16, column: 1, offset: 168},
                    end: {line: 16, column: 19, offset: 186}
                  }
                }],
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
                children: [{
                  type: 'text',
                  value: 'Hello, world!',
                  position: {
                    start: {line: 20, column: 4, offset: 256},
                    end: {}
                  }
                }],
                position: {
                  start: {line: 20, column: 1, offset: 253},
                  end: null
                }
              }
            ],
            data: {quirksMode: undefined},
            position: {
              start: {line: 1, column: 1, offset: 0},
              end: {line: 21, column: 1, offset: 270}
            }
          },
          'should equal the fixture tree'
        );
      }
    })
    .use(stringify)
    .process([
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
    ].join('\n'), function (err, file) {
      t.ifErr(err, 'should not fail');

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
      );
    });

  t.end();
});

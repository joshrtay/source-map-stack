/**
 * Imports
 */

var test = require('tape')
var path = require('path')
var vm = require('vm')
var fs = require('fs')
var requireContent = require('@f/require-content')
var sourceMap = require('../src')


/**
 * Tests
 */

test('should work', function (t) {
  var content = fs.readFileSync(path.join(__dirname, './fixtures/build.js'))
  var map = sourceMap.get(content)
  var woot = requireContent(content)

  try {
    woot()
  } catch (e) {
    var original = e.stack
    var mapped = sourceMap.stack(map, e, __dirname + '/fixtures')
    t.ok(original.indexOf('evalmachine.<anonymous>') >= 0)
    t.ok(mapped.indexOf('fixtures/nested.js') >= 0)
    t.ok(mapped.indexOf('fixtures/index.js') >= 0)
    t.end()
  }

})

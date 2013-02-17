var tokenizer = require('./lib/tokenizer')
  , parser = require('./lib/parser')
  , through = require('through')
  , fs = require('fs')

module.exports = parse
module.exports.sync = sync
module.exports.tokenizer = tokenizer
module.exports.parser = parser

function parse(load) {
  load = load || fs.readFile 

  var tokens = tokenizer()
    , parsed = parser(load)
    , stream = through(write)

  tokens.on('error', error)
  parsed.on('error', error)

  stream.scope = function() {
    return parsed.scope
  }

  tokens.pipe(parsed)
  parsed.on('data', output)

  return stream

  function write(data) {
    tokens.write(data.toString('utf8'))
  }

  function output(node) {
    stream.queue(node)
  } 

  function error(err) {
    stream.emit('error', err)
  }
}

function sync(string, load) {
  load = load || fs.readFileSync
  var p = parse()
    , n

  p.on('data', function(node) {
    n = node
  })
  p.end(string)
  return n
}

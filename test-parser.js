var tokenizer = require('./lib/tokenizer')
  , parser = require('./lib/parser')
  , fs = require('fs')

fs.createReadStream('example.proto')
  .pipe(tokenizer())
  .pipe(parser(function(path, ready) { fs.readFile(path, 'utf8', ready) }))
  .on('data', function(node) {
    var len = 0
      , _ = node
      , out = []
    while(node) { out.push(node.name ? node.type + '/' + node.name : node.type); node = node.parent; ++len }
    console.log(len, out.reverse().join('.'))
  })

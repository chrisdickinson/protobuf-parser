var parse = require('./index')
  , fs = require('fs')

fs.createReadStream('example.proto')
  .pipe(parse())
  .on('data', function(node) {
    var len = 0
      , _ = node
      , out = []
    while(node) { out.push(node.name ? node.type + '/' + node.name : node.type); node = node.parent; ++len }
    console.log(len, out.reverse().join('.'))
  })

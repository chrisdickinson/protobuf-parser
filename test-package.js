var parse = require('./index')
  , fs = require('fs')
  , sc

fs.createReadStream('example.proto')
  .pipe(sc = parse())
  .on('data', function(node) {
    var len = 0
      , _ = node
      , out = []
      , scopes = []
      , scope
   
    scope = sc.scope()
    while(scope) { scopes.push(Object.keys(scope.declarations)); scope = scope.parent; } 
    while(node) { out.push(node.name ? node.type + '/' + node.name : node.type); node = node.parent; ++len }
    console.log(len, out.reverse().join('.'))
    //console.log(scopes)
  })

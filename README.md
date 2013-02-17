# protobuf-parser

a tool for parsing `*.proto` files and turning them into an AST.

```javascript

var parse = require('protobuf-parser')
  , fs = require('fs')

fs.createReadStream('example.proto')
  .pipe(parse())
  .on('data', function(node) {
    console.log('node was emitted:', node.type)
  })

// or:

var root = parse.sync(fs.readFileSync('example.proto', 'utf8'))

```

## API

#### parse = require('protobuf-parser')

#### parse([function loader(filename, ready)]) -> r/w stream emitting AST nodes as they finish

#### parseStream.scope() -> the scope at the moment

#### parse.sync(str data[, function loader(filename, ready)]) -> root AST node

#### parse.tokenizer() -> r/w tokenizer stream

#### parse.parser([function loader(filename, ready)]) -> r/w parser stream

# License

MIT

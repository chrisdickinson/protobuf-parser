var tokenizer = require('./lib/tokenizer')
  , fs = require('fs')

fs.createReadStream('example.proto')
  .pipe(tokenizer())
  .on('data', function(token) {
    console.log(token)
  })

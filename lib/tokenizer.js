module.exports = tokenizer

var through = require('through')
  , keywords = require('./keywords')

var _ = 0
  , STATE_READY = _++
  , STATE_IDENT = _++
  , STATE_NUMBER = _++
  , STATE_OPERATOR = _++
  , STATE_COMMENT = _++
  , STATE_BLOCK_COMMENT = _++
  , STATE_STRING = _++
  , STATE_KEYWORD = _++
  , STATE_EOF = _++

tokenizer.states = {
    ready:          STATE_READY
  , ident:          STATE_IDENT
  , number:         STATE_NUMBER
  , comment:        STATE_COMMENT
  , block_comment:  STATE_BLOCK_COMMENT
  , string:         STATE_STRING
  , keyword:        STATE_KEYWORD
  , eof:            STATE_EOF
}

var whitespace = /\s/
  , ident = /[\w_]/
  , number = /\d/
  , string = /["']/
  , operator = /[\.:;\(\)\[\]=\/\\\{\}]/

function tokenizer() {
  var stream = through(write, end)
    , state = STATE_READY
    , advance = true
    , accum = []
    , token = []
    , delim
    , char
    , last

  return stream

  function write(data) {
    accum = accum.concat(data.toString('utf8').split(''))

    while(accum.length) {
      if(advance) {
        last = char
        char = accum.shift()
      }
      advance = false
      switch(state) {
        case STATE_READY: state_ready(); break
        case STATE_IDENT: state_ident(); break
        case STATE_NUMBER: state_number(); break
        case STATE_COMMENT: state_comment(); break
        case STATE_BLOCK_COMMENT: state_block_comment(); break
        case STATE_OPERATOR: state_operator(); break
        case STATE_STRING: state_string(); break
      }
    }

    advance = false
  }
  
  function end(chunk) {
    if(arguments.length) {
      write(chunk)
    }

    if(token.length) {
      emit(token)
    }

    state = STATE_EOF
    emit(['(eof)'])
    stream.queue(null)
  }

  function state_ready() {
    if(whitespace.test(char)) {
      advance = true
      return
    }

    if(number.test(char)) {
      state = STATE_NUMBER
      return
    }

    if(ident.test(char)) {
      state = STATE_IDENT
      return
    }

    if(string.test(char)) {
      state = STATE_STRING
      return
    }

    if(operator.test(char)) {
      state = STATE_OPERATOR
      return
    }
  }

  function state_ident() {
    if(ident.test(char) || number.test(char)) {
      advance = true
      token[token.length] = char
      return 
    }

    emit(token, keywords.indexOf(token.join('')) > -1 ? STATE_KEYWORD : STATE_IDENT)
    state = STATE_READY
  }

  function state_string() {
    advance = true
    if(!token.length && string.test(char)) {
      delim = char
      return
    }

    if(last !== '\\' && char === delim) {
      emit(token)
      state = STATE_READY
      return
    }

    if(char !== '\\' || last === '\\') {
      token[token.length] = char
    }
  }

  function state_number() {
    if(!number.test(char)) {
      emit(token)
      state = STATE_READY
      return
    }

    token[token.length] = char
    advance = true
  }

  function state_operator() {
    if(char === '/' && last === '/') {
      state = STATE_COMMENT
      return
    }

    if(char === '*' && last === '/') {
      state = STATE_BLOCK_COMMENT
      advance = true
      return
    }

    if(number.test(char) && last === '-') {
      state = STATE_NUMBER
      return
    }

    if(!operator.test(char) || token.length > 1) {
      var bits = token.slice()
      for(var i = 0, len = bits.length; i < len; ++i) {
        emit([bits[i]])
      }
      token.length = 0
      state = STATE_READY
      return
    }

    advance = true
    token[token.length] = char
  }

  function state_comment() {
    token.length = 0
    if(char !== '\n') {
      advance = true
    } else {
      state = STATE_READY
    } 
  }

  function state_block_comment() {
    advance = true
    token.length = 0
    if(last === '*' && char === '/') {
      state = STATE_READY
      return
    }

  }

  function emit(arr, as) {
    as = as || state
    stream.queue({
        data: arr.join('')
      , type: as
    })

    arr.length = 0
  }  
}

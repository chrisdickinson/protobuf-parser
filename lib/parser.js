module.exports = parser

var through = require('through')
  , keywords = require('./keywords')
  , tokenizer = require('./tokenizer')
  , scope = require('./scope')
  , token_types = tokenizer.states

var _ = 0
  , STATE_PROGRAM = _++
  , STATE_MESSAGE = _++
  , STATE_MESSAGE_BODY = _++
  , STATE_MESSAGE_EXTENSIONS = _++
  , STATE_ENUM = _++
  , STATE_ENUM_BODY = _++
  , STATE_EXTEND = _++
  , STATE_EXTEND_BODY = _++
  , STATE_SERVICE = _++
  , STATE_SERVICE_BODY = _++
  , STATE_FIELD = _++
  , STATE_FIELD_OPTION = _++
  , STATE_RPC_FIELD = _++
  , STATE_RPC_FIELD_NAME = _++
  , STATE_RPC_FIELD_ACCEPT = _++
  , STATE_RPC_FIELD_RETURNS = _++
  , STATE_PACKAGE = _++
  , STATE_IMPORT = _++
  , STATE_OPTION = _++
  , STATE_OPTION_TARGET = _++
  , STATE_OPTION_CUSTOM_TARGET = _++
  , STATE_OPTION_SET = _++
  , STATE_REFERENCE = _++
  , STATE_IDENT = _++
  , STATE_OPERATOR = _++

var type_map = {}
type_map[STATE_PROGRAM] = 'program'
type_map[STATE_MESSAGE] = 'message'
type_map[STATE_MESSAGE_BODY] = 'message_body'
type_map[STATE_MESSAGE_EXTENSIONS] = 'message_extensions'
type_map[STATE_ENUM] = 'enum'
type_map[STATE_ENUM_BODY] = 'enum_body'
type_map[STATE_EXTEND] = 'extend'
type_map[STATE_EXTEND_BODY] = 'extend_body'
type_map[STATE_SERVICE] = 'service'
type_map[STATE_SERVICE_BODY] = 'service_body'
type_map[STATE_FIELD] = 'field'
type_map[STATE_FIELD_OPTION] = 'field_option'
type_map[STATE_RPC_FIELD] = 'rpc_field'
type_map[STATE_RPC_FIELD_NAME] = 'rpc_field_name'
type_map[STATE_RPC_FIELD_ACCEPT] = 'rpc_field_accept'
type_map[STATE_RPC_FIELD_RETURNS] = 'rpc_field_returns'
type_map[STATE_PACKAGE] = 'package'
type_map[STATE_IMPORT] = 'import'
type_map[STATE_OPTION] = 'option'
type_map[STATE_OPTION_TARGET] = 'option_target'
type_map[STATE_OPTION_CUSTOM_TARGET] = 'option_custom_target'
type_map[STATE_OPTION_SET] = 'option_set'
type_map[STATE_REFERENCE] = 'reference'
type_map[STATE_IDENT] = 'ident'
type_map[STATE_OPERATOR] = 'operator'

var base_unshift = [].unshift
  , base_shift = [].shift

function parser(fetch_import) {
  var stream = through(write, end)
    , state = [make_node(STATE_PROGRAM, null), null]
    , tokens = []
    , errored = false
    , program
    , token
    , node

  node = state[0]
  state.shift = shift
  state.unshift = unshift 
  stream.scope = scope(state[0])

  return stream

  function write(input) {
    tokens.push(input)

    while(take() && state[0]) switch(state[0].mode) {
      case STATE_PROGRAM: parse_program(); break
      case STATE_MESSAGE: parse_message(); break
      case STATE_MESSAGE_BODY: parse_message_body(); break
      case STATE_MESSAGE_EXTENSIONS: parse_message_extensions(); break
      case STATE_ENUM: parse_enum(); break
      case STATE_ENUM_BODY: parse_enum_body(); break
      case STATE_EXTEND: parse_extend(); break
      case STATE_EXTEND_BODY: parse_extend_body(); break
      case STATE_SERVICE: parse_service(); break
      case STATE_SERVICE_BODY: parse_service_body(); break
      case STATE_FIELD: parse_field(); break
      case STATE_FIELD_OPTION: parse_field_option(); break
      case STATE_RPC_FIELD: parse_rpc_field(); break
      case STATE_RPC_FIELD_NAME: parse_rpc_field_name(); break
      case STATE_RPC_FIELD_ACCEPT: parse_rpc_field_accept(); break
      case STATE_RPC_FIELD_RETURNS: parse_rpc_field_returns(); break
      case STATE_PACKAGE: parse_package(); break
      case STATE_IMPORT: parse_import(); break
      case STATE_OPTION: parse_option(); break
      case STATE_OPTION_TARGET: parse_option_target(); break
      case STATE_OPTION_CUSTOM_TARGET: parse_option_custom_target(); break
      case STATE_OPTION_SET: parse_option_set(); break
      case STATE_REFERENCE: parse_reference(); break
      case STATE_IDENT: parse_ident(); break
      case STATE_OPERATOR: parse_operator(); break
    }
  }

  function end(token) {
    if(arguments.length) {
      write(token)
    }

    if(state.length > 1) {
      stream.emit('error', new Error('unexpected eof'))
      return
    }

    stream.queue(null)
  }

  function take() {
    if(errored || !state.length) {
      return errored
    }

    token = tokens[0]
    return !stream.paused && token
  }

  function advance(shift) {
    if(shift) {
      tokens.shift()
    }
    ++node.stage
  }

  function shift() {
    var new_node = base_shift.call(this)
    stream.queue(new_node)
    node = new_node.parent
    return new_node
  }

  function unshift(new_node) {
    new_node.parent = state[0]
    var unshifted = base_unshift.call(this, new_node) 
    
    node.children.push(new_node)
    node = new_node
    return unshifted
  }

  // -------- parsers -------------

  function parse_program() {
    if(token.type === token_types.keyword) switch(token.data) {
      case 'option':    state.unshift(make_node(STATE_OPTION)); return
      case 'package':   state.unshift(make_node(STATE_PACKAGE)); return
      case 'message':   state.unshift(make_node(STATE_MESSAGE)); return
      case 'extend':    state.unshift(make_node(STATE_EXTEND)); return
      case 'enum':      state.unshift(make_node(STATE_ENUM)); return
      case 'service':   state.unshift(make_node(STATE_SERVICE)); return
      case 'import':    state.unshift(make_node(STATE_IMPORT)); return
    }

    if(token.type === token_types.eof) {
      return state.shift()
    }    
    return unexpected('Unexpected token '+token.data)
  }

  function parse_message() {
    if(node.stage === 0) {
      expect('message')
      advance(true)
      return
    }

    if(node.stage === 1) {
      node.name = token.data
      advance(true) 
      return
    }

    if(node.stage === 2) {
      stream.scope = stream.scope.define(node.name)
      advance()
      state.unshift(make_node(STATE_MESSAGE_BODY))
      return
    }

    stream.scope = stream.scope.parent
    state.shift()
  }

  function parse_message_body() {
    if(node.stage === 0) {
      expect('{')
      return advance(true)
    }

    if(node.stage === 1 && token.data === '}') {
      advance(true)
      return state.shift()
    }

    if(token.type === token_types.keyword) switch(token.data) {
      case 'optional':
      case 'required':
      case 'repeated': state.unshift(make_node(STATE_FIELD)); return
      case 'enum': state.unshift(make_node(STATE_ENUM)); return
      case 'extend': state.unshift(make_node(STATE_EXTEND)); return
      case 'option': state.unshift(make_node(STATE_OPTION)); return
      case 'extensions': state.unshift(make_node(STATE_MESSAGE_EXTENSIONS)); return
      case 'message': state.unshift(make_node(STATE_MESSAGE)); return
    }
  }

  function parse_message_extensions() {
    // "extensions" <num> "to" <num | "max">    

    if(node.stage === 0) {
      state.scope.node.extensions = []
      expect('extensions')
      return advance(true)
    }

    if(node.stage === 1) {
      state.scope.node.extensions[0] = parseInt(token.data, 10)
      return advance(true)
    }

    if(node.stage === 2) {
      expect('to')
      return advance(true)
    }

    if(node.stage === 3) {
      state.scope.node.extensions[1] = token.data === 'max' ? Infinity : parseInt(token.data, 10)
      return advance(true)
    }

    advance(true)
    state.shift()
  }

  function parse_enum() {
    if(node.stage === 0) {
      expect('enum')
      advance(true)
      return
    }

    if(node.stage === 1) {
      stream.scope = stream.scope.define(token.data, node)
      advance(true)
      return
    }

    if(node.stage === 2) {
      advance()
      state.unshift(make_node(STATE_ENUM_BODY))
      return
    }
  
    stream.scope = stream.scope.parent
    state.shift() 
  }

  function parse_enum_body() {
    if(node.stage === 0) {
      expect('{')
      node.parent.enumerations = {}
      advance(true)

      return
    }

    if(token.data === 'option') {
      state.unshift(STATE_OPTION)
      return
    }

    if(token.data === '}') {
      state.shift()

      return advance(true)
    } 

    // otherwise we're looping through PROPERTY "=" NUMBER ";" 

    if(node.stage === 1) {
      node.enumeration = [token.data]
      advance(true)
      return
    }

    if(node.stage === 2) {
      expect('=')
      advance(true)
      return
    }

    if(node.stage === 3) {
      stream.scope.parent.define(
          node.enumeration[0]
        , node.parent.enumerations[node.enumeration[0]] = parseInt(token.data, 10)
      )
      return advance(true)
    }

    if(node.stage === 4) {
      expect(';')
      node.enumeration = null
      advance(true)
      node.stage = 1
      return
    }
  }

  function parse_extend() {
    if(node.stage === 0) {
      expect('extend')
      return advance(true)
    }

    if(node.stage === 1) {
      state.unshift(make_node(STATE_REFERENCE))
      return advance()
    } 

    if(node.stage === 2) {
      node.original_scope = stream.scope
      stream.scope = stream.scope.lookup(node.children[0])
      node.target = stream.scope.node 
      state.unshift(make_node(STATE_EXTEND_BODY))
      return advance()
    }

    stream.scope = node.original_scope
    node.original_scope = null
    return state.shift()
  }

  function parse_extend_body() {
    if(node.stage === 0) {
      expect('{')
      advance(true)
      return
    }    

    if(token.data === '}') {
      advance(true)
      state.shift()
      return
    }

    if(node.stage === 1) switch(token.data) {
      case 'optional':
      case 'required':
      case 'repeated': state.unshift(make_node(STATE_FIELD)); return
    }
  }

  function parse_service() {
    if(node.stage === 0) {
      expect('service')
      advance(true)
      return
    }    

    if(node.stage === 1) {
      node.name = token.data
      advance(true)
      return
    }

    if(node.stage === 2) {
      stream.scope = stream.scope.define(node.name, node)
      state.unshift(make_node(STATE_SERVICE_BODY))
      return
    }

    stream.scope = stream.scope.parent
    state.shift()
  }

  function parse_service_body() {
    if(node.stage === 0) {
      expect('{')
      advance(true)
      return
    }    

    if(token.data === '}') {
      advance(true)
      state.shift()
      return
    }

    if(token.data !== 'rpc' && token.data !== 'option') {
      expect('rpc or option')
      return
    }

    if(token.data === 'option') {
      state.unshift(make_node(STATE_OPTION))
      return
    }

    state.unshift(make_node(STATE_RPC_FIELD))
  }

  function parse_field() {
    if(node.stage === 0) {
      node.type = token.data
      advance(true)
      return
    }    

    if(node.stage === 1) {
      if(keywords.indexOf(token.data) > -1) {
        node.subtype = token.data
        advance(true)
      } else {
        advance()
        state.unshift(make_node(STATE_REFERENCE))
      }
      return
    }

    if(node.stage === 2) {
      if(!node.subtype) {
        node.subtype = stream.scope.lookup(node.children[0])
      }

      node.name = token.data
      advance(true)
      return
    }

    if(node.stage === 3) {
      expect('=')
      advance(true)
      return
    }

    if(node.stage === 4) {
      if(token.type === token_types.number) {
        node.slot = token.data
        advance(true)
      } else {
        state.unshift(make_node(STATE_REFERENCE))
      }
      return
    }

    if(node.stage === 5) {
      state.options = {}
      if(!('slot' in node)) {
        node.slot = stream.scope.lookup(node.children[node.children.length - 1]).token 
      }

      if(token.data === '[') {
        advance(true)
        state.unshift(make_node(STATE_FIELD_OPTION))
        return
      }
      node.stage = 7
      return
    }

    if(node.stage === 6) {
      state.options[node.children[node.children.length - 1].name] = node.children[node.children.length - 1].value

      expect(']')
      advance(true)
      return
    }

    expect(';')
    advance(true)
    state.shift()
  }

  function parse_field_option() {
    if(node.stage === 0) {
      node.parent.options = node.parent.options || {}
      node.parent.options[token.data] = true
      node.name = token.data
      advance(true)
      return
    } 

    if(node.stage === 1) {
      if(token.data !== '=') {
        state.shift()
        return
      }

      advance(true)
      return
    }

    if(node.stage === 2) {
      node.parent.options[node.name] = token.data
      advance(true)
      return
    }

    state.shift()
  }

  function parse_rpc_field() {
    
  }

  function parse_rpc_field_name() {
    
  }

  function parse_rpc_field_accept() {
    
  }

  function parse_rpc_field_returns() {
    
  }

  function parse_package() {
    if(node.stage === 0) {
      expect('package')
      advance(true)
      return
    }    

    if(node.stage === 1) {
      advance()
      state.unshift(make_node(STATE_REFERENCE))
      return
    }

    if(node.stage === 2) {
      stream.scope = stream.scope.set_package(node.children[0].bits)
      expect(';')
      advance(true)
      state.shift()
      return
    }
  }

  function parse_import() {
    if(node.stage === 0) {
      expect('import')
      advance(true)
      return
    }
    
    if(node.stage === 1) {
      stream.pause()
      fetch_import(token.data, function(err, data) {

        if(err) {
          return unexpected('things did not go well'+err.stack)
        }

        var tk = tokenizer()
          , parse = parser(fetch_import)
          , root

        tk.pipe(parse)
          .on('data', function(node) {
            // emit other package's nodes
            stream.emit('data', node)
            root = parse.scope
          })
          .on('end', function() {
            stream.scope.root().merge(parse.scope)
            advance(true)
            stream.resume()
          })

        tk.end(data)
      })
    }

    if(node.stage === 2) {
      expect(';')
      advance(true)
      return
    }

    if(node.stage === 3) {
      state.shift()
      return
    }
  }

  function parse_option() {
    if(node.stage === 0) {
      expect('option')
      advance(true)
      return
    }

    if(node.stage === 1) {
      node.parent.options = node.parent.options || {}
      node.parent.options[token.data] = true
      node.name = token.data
      advance(true)
      return
    }

    if(node.stage === 2) {
      if(token.data === '=') {
        advance(true)
        return
      } else {
        expect(';')
        advance(true)
        state.shift()
        return
      }
    }

    if(node.stage === 3) {
      if(token.type === token_types.number ||
         token.type === token_types.string ||
         token.type === token_types.boolean) {
        node.parent.options[node.name] = token.data
        node.value = token.data
        advance(true)
      } else {
        advance()
        state.unshift(make_node(STATE_REFERENCE))
      }
      return
    }

    if(node.stage === 4) {
      if(!('value' in node)) {
        node.value = node.parent.options[node.name] = stream.scope.lookup(node.children[0]).token
      }

      expect(';')
      advance(true)
    }

    if(node.stage === 5) {
      state.shift()
      return
    }
  }

  function parse_option_target() {
    
  }

  function parse_option_custom_target() {
    
  }

  function parse_option_set() {
    
  }

  function parse_reference() {
    if(node.stage === 0) {
      node.from_root = token.data === '.'
      node.bits = []
      if(!node.from_root) {
        node.bits.push(token.data)
      }

      advance(true)
      node.stage = node.from_root ? 1 : 2
      return
    }

    if(node.stage === 1) {
      if(token.data === '.') {
        unexpected('unexpected `.`')
        return
      }

      node.bits.push(token.data)
      advance(true)
      return
    }

    if(node.stage === 2) {
      if(token.data !== '.') {
        state.shift()
        return
      }
      advance(true)
      node.stage = 1
      return
    }
  }

  function parse_ident() {
    
  }

  function parse_operator() {
    
  }

  // ---- helpers ----

  function expect(value) {
    if(token.data !== value) {
      return unexpected('expected `'+value+'`, got `'+token.data+'`!')
    }
  }

  function unexpected(msg) {
    errored = true
    stream.emit('error', msg)
  }
}

function make_node(mode, from_token) {
  return {
      children: []
    , mode:     mode
    , parent:   null
    , token:    from_token
    , type:     type_map[mode]
    , stage:    0
  }
}

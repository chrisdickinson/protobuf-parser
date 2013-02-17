module.exports = scope

function scope(root_node) {
  return new Scope(root_node, null)
}

function Scope(node, parent) {
  this.node = node 
  this.parent = parent
  this.declarations = {}
}

var cons = Scope
  , proto = cons.prototype

proto.set_package = function(children) {
  var bits = children
    , new_root
    , curret
    
  new_root = current = new Scope(this.node)

  for(var i = 0, len = children.length; i < len; ++i) {
    current = current.define(children[i], this.node)
  }

  current.declarations = this.declarations
  this.node =
  this.parent =
  this.declarations = null

  return new_root
}

proto.merge = function(rhs) {
  for(var key in rhs.declarations) {
    if(this.declarations[key]) {
      this.declarations[key].merge(rhs.declarations[key])
    } else {
      this.declarations[key] = rhs.declarations[key]
      this.declarations[key].parent = this
    }
  }
}

proto.define = function(name, node) {
  return this.declarations[name] = new Scope(node, this)
}

proto.lookup = function(children) {
  if(children.bits.length === 1) {
    if(children.bits[0] === 'true') return {token: true}
    if(children.bits[0] === 'false') return {token: false}
  }

  if(children.from_root && this.parent) {
    return this.root().lookup(children)
  }

  if(this.declarations[children.bits[0]]) {
    return this.declarations.lookup({bits: children.bits.slice(1)})
  }

  return
}

proto.root = function() {
  if(!this.parent) {
    return this
  }
  return this.parent.root()
}

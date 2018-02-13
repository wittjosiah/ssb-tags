var FlumeReduce = require('flumeview-reduce')
var ref = require('ssb-ref')
var get = require('lodash/get')
var merge = require('lodash/merge')

exports.name = 'tags'
exports.version = require('./package.json').version
exports.manifest = {
  stream: 'source',
  get: 'async'
}

var initialState = {}

exports.init = function(ssb, config) {
  return ssb._flumeUse('tags', FlumeReduce('test', reduce, map, null, initialState))

  function reduce(result, item) {
    if (!item) return result

    var { root, tagKey, author, message, tagged, timestamp } = item
    var storedTimestamp = get(result, [author, tagKey, message])

    if (root) {
      var rootTag = {
        [author]: {
          [tagKey]: {}
        }
      }
      result = merge(result, rootTag)
    } else if (shouldAddTag()) {
      var newTag = {
        [author]: {
          [tagKey]: {
            [message]: timestamp
          }
        }
      }
      result = merge(result, newTag)
    } else if (shouldRemoveTag()) {
      delete result[author][tagKey][message]
    }
  
    return result

    function shouldAddTag() {
      if (!tagged) return false
      return !storedTimestamp || timestamp > storedTimestamp
    }

    function shouldRemoveTag() {
      return storedTimestamp && tagged === false
    }
  }
  
  function map(msg) {
    // only include your own tags (for now)
    if (msg.value.author !== ssb.id) return
  
    // unbox private message
    if (msg.value.content === 'string') {
      // unbox private message (requires ssb-private plugin)
      msg = ssb.private.unbox(msg)
    }

    if (isTag(msg)) {
      return {
        tagKey: msg.value.content.root,
        author: msg.value.author,
        message: msg.value.content.message,
        tagged: msg.value.content.tagged,
        timestamp: msg.value.timestamp
      }
    } else if (isRootTag(msg)) {
      return {
        tagKey: msg.key,
        author: msg.value.author,
        timestamp: msg.value.timestamp,
        root: true
      }
    } 
  }
}

function isRootTag(msg) {
  return get(msg, 'value.content.type') === 'tag'
}

function isTag(msg) {
  return get(msg, 'value.content.type') === 'tag'
    && ref.isLink(get(msg, 'value.content.message'))
}

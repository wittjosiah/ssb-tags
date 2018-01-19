var FlumeReduce = require('flumeview-reduce')
var ref = require('ssb-ref')
var _ = require('lodash')

exports.name = 'tags'
exports.version = require('./package.json').version
exports.manifest = {
  stream: 'source',
  get: 'async'
}

var initialState = {}

exports.init = function (ssb, config) {
  return ssb._flumeUse('tags', FlumeReduce('test', reduce, map, null, initialState))

  function reduce(result, item) {
    if (!item) return result

    var { tag, author, message, tagged, timestamp } = item
    var current = _.at(result, `${author}.${tag}.${message}`)[0]

    if (tagged && (!current || timestamp > current)) {
      var newTag = {
        [author]: {
          [tag]: {
            [message]: timestamp
          }
        }
      }
      result = _.merge(result, newTag)
    } else if (!tagged && current) {
      delete result[author][tag][message]
    }
  
    return result
  }
  
  function map(msg) {
    // only include your own tags (for now)
    if (msg.value.author !== ssb.id) return
  
    // unbox private message
    if (msg.value.content === 'string') {
      // unbox private message (requires ssb-private plugin)
      msg = ssb.private.unbox(msg)
    }
  
    if (msg.value.content && msg.value.content.type === 'tag' && ref.isLink(msg.value.content.message)) {
      return {
        tag: msg.key,
        author: msg.value.author,
        message: msg.value.content.message,
        tagged: msg.value.content.tagged,
        timestamp: msg.value.timestamp
      }
    }
  }
}

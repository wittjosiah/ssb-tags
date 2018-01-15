var FlumeReduce = require('flumeview-reduce')
var ref = require('ssb-ref')

exports.name = 'tags'
exports.version = require('./package.json').version
exports.manifest = {
  stream: 'source',
  get: 'async'
}

exports.init = function (ssb, config) {
  return ssb._flumeUse('tags', FlumeReduce('test', reduce, map))

  function reduce (result, item) {
    if (!result) result = {}
    if (!result.tags) result.tags = {}
    if (!result.messages) result.messages = {}
    var tags = result.tags
    var messages = result.messages
  
    if (item) {
      var { tag, author, message, tagged, timestamp } = item

      if (!tags[author]) tags[author] = {}
      if (!tags[author][tag]) tags[author][tag] = {}
      if (
        tagged &&
        (!tags[author][tag][message] || 
          timestamp > tags[author][tag][message].timestamp)
      ) {
        tags[author][tag][message] = { timestamp, tagged }
      } else if (!tagged && tags[author][tag][message]) {
        delete tags[author][tag][message]
      }

      if (!messages[message]) messages[message] = {}
      if (!messages[message][tag]) messages[message][tag] = {}
      if (
        tagged &&
        (!messages[message][tag][author] ||
          timestamp > messages[message][tag][author].timestamp)
      ) {
        messages[message][tag][author] = { timestamp, tagged }
      } else if (!tagged && messages[message][tag][author]) {
        delete messages[message][tag][authpr]
      }
    }
  
    return result
  }
  
  function map (msg) {
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

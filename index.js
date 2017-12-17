var FlumeReduce = require('flumeview-reduce')
var ref = require('ssb-ref')

exports.name = 'sbot-tags'
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
    var tags = result.tags
  
    if (item) {
      var { author, tag, message, tagged, timestamp } = item
      if (!tags[author]) tags[author] = {}
      if (!tags[author][tag]) tags[author][tag] = {}
      if (!tags[author][tag][message] || timestamp > tags[author][tag][message].timestamp) {
        tags[author][tag][message] = { timestamp, tagged }
      }
    }
  
    return result
  }
  
  function map (msg) {
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

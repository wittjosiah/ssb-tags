var FlumeReduce = require('flumeview-reduce')
var ref = require('ssb-ref')
var get = require('lodash/get')
var merge = require('lodash/merge')
var TagHelper = require('scuttle-tag')

exports.name = 'tags'
exports.version = require('./package.json').version
exports.manifest = {
  stream: 'source',
  get: 'async'
}

var initialState = {}

exports.init = function (ssb, config) {
  var ScuttleTag = TagHelper(ssb)
  return ssb._flumeUse('tags', FlumeReduce(2, reduce, map, null, initialState))

  function reduce (result, item) {
    if (!item) return result

    var { root, tagKey, author, message, tagged, timestamp } = item
    var storedTimestamp = get(result, [author, tagKey, message])
    var shouldAddTag = tagged && (!storedTimestamp || timestamp > storedTimestamp)
    var shouldRemoveTag = storedTimestamp && tagged === false

    if (root) {
      var rootTag = {
        [author]: {
          [tagKey]: {}
        }
      }
      result = merge(result, rootTag)
    } else if (shouldAddTag) {
      var newTag = {
        [author]: {
          [tagKey]: {
            [message]: timestamp
          }
        }
      }
      result = merge(result, newTag)
    } else if (shouldRemoveTag) {
      delete result[author][tagKey][message]
    }

    return result
  }

  function map (msg) {
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

  // TODO: pull helper function into scuttle-tag
  function isRootTag (msg) {
    return ScuttleTag.sync.isTag(msg) && !get(msg, 'value.content.message')
  }

  function isTag (msg) {
    return ScuttleTag.sync.isTag(msg) && ref.isLink(get(msg, 'value.content.message'))
  }
}

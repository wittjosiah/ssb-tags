var FlumeReduce = require('flumeview-reduce')
var pull = require('pull-stream')
var ref = require('ssb-ref')
var get = require('lodash/get')
var merge = require('lodash/merge')
var map = require('lodash/map')
var sortBy = require('lodash/sortBy')
var entries = require('lodash/entries')
var has = require('lodash/has')
var TagHelper = require('scuttle-tag')

exports.name = 'tags'
exports.version = require('./package.json').version
exports.manifest = {
  stream: 'source',
  get: 'async',
  streamTaggedMessages: 'source',
  getTaggedMessages: 'async',
  streamMessagesTaggedWith: 'source',
  getMessagesTaggedWith: 'async'
}

var initialState = {}

exports.init = function (ssb, config) {
  var ScuttleTag = TagHelper(ssb)
  var view = ssb._flumeUse('tags', FlumeReduce(3, tagsReduce, tagsMap, null, initialState))

  return {
    stream: view.stream,
    get: view.get,
    streamTaggedMessages,
    getTaggedMessages,
    streamMessagesTaggedWith,
    getMessagesTaggedWith
  }

  function getTaggedMessages (cb) {
    view.get((err, data) => {
      if (err) cb(err)
      var messages = {}
      for (var author in data) {
        for (var tag in data[author]) {
          for (var msg in data[author][tag]) {
            var timestamp = data[author][tag][msg]
            if (!messages[msg] || messages[msg] < timestamp) messages[msg] = timestamp
          }
        }
      }
      var sortedMsgIds = map(sortBy(entries(messages), ([msgId, timestamp]) => -timestamp), 0)
      cb(null, sortedMsgIds)
    })
  }

  function streamTaggedMessages (opts) {
    return pull(
      view.stream(opts),
      pull.map((item) => {
        if (item.tagKey) return item
        var messages = {}
        for (var author in item) {
          for (var tag in item[author]) {
            for (var msg in item[author][tag]) {
              var timestamp = item[author][tag][msg]
              if (!messages[msg] || messages[msg] < timestamp) messages[msg] = timestamp
            }
          }
        }
        return map(sortBy(entries(messages), ([msgId, timestamp]) => -timestamp), 0)
      })
    )
  }

  function getMessagesTaggedWith (tagId, cb) {
    view.get((err, data) => {
      if (err) cb(err)
      var messages = {}
      for (var author in data) {
        for (var msg in data[author][tagId]) {
          var timestamp = data[author][tagId][msg]
          if (!messages[msg] || messages[msg] < timestamp) messages[msg] = timestamp
        }
      }
      var sortedMsgIds = map(sortBy(entries(messages), ([msgId, timestamp]) => -timestamp), 0)
      cb(null, sortedMsgIds)
    })
  }

  function streamMessagesTaggedWith (tagId, opts) {
    return pull(
      view.stream(opts),
      pull.filter((item) => {
        // if `tagKey` property does not exist `item` is the index
        // which needs to be reduced
        var live = has(item, 'tagKey')
        return !live || item.tagKey === tagId
      }),
      pull.map((item) => {
        if (item.tagKey) return item
        var messages = {}
        for (var author in item) {
          for (var msg in item[author][tagId]) {
            var timestamp = item[author][tagId][msg]
            if (!messages[msg] || messages[msg] < timestamp) messages[msg] = timestamp
          }
        }
        return map(sortBy(entries(messages), ([msgId, timestamp]) => -timestamp), 0)
      })
    )
  }

  function tagsReduce (result, item) {
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

  function tagsMap (msg) {
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

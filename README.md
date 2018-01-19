# sbot-tags

[scuttlebot](http://scuttlebutt.nz/) plugin for indexing reduced "tags" state.

## API

### `sbot.tags.get((err, data) => ...)`

`data` is an object of form

```js
{
  // a user id
  '@DOIjef...': {  
    // a tag id
    '%cJEMdje...': {
        // a msg id
        '%x423jsadxj...': 1204594095 // timestamp tag was created
    }
  }
}
```

### `sbot.tags.stream() => pull-stream`

See [flumeview-reduce docs](https://github.com/flumedb/flumeview-reduce#dbnamestreamlive-boolean--pullsource).

## License

MIT

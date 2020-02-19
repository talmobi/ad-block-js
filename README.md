[![npm](https://img.shields.io/npm/v/ad-block-js.svg?maxAge=3600&style=flat-square)](https://www.npmjs.com/package/ad-block-js)
[![npm](https://img.shields.io/npm/l/ad-block-js.svg?maxAge=3600&style=flat-square)](https://github.com/talmobi/ad-block-js/blob/master/LICENSE)

#  ad-block-js
parse subset of ad-block address/url blocking rules

supports: \*wildcards\*, ||domain, |beginning, end|, separator^ ( /:?=& )

ignores: @@exceptions, $options, ##elements, /regex/

ref: https://help.eyeo.com/en/adblockplus/how-to-write-filters#introduction

## Easy to use

#### Module usage
```javascript
const abjs = require( 'ad-block-js' )
const client = abjs.create()

// curl -O https://easylist.to/easylist/easylist.txt
const easylist = require( 'fs' ).readFileSync( 'easylist.txt', 'utf8' )

easylist.split( '\r?\n' ).forEach( function ( rule ) {
  client.add( rule )
} )

const url = 'example.com/foo/bar.gif'
console.log( client.matches( url ) ) // false

const adurl = 'example.com/foo/bar.gif&adflag='
console.log( client.matches( adurl ) ) // true
```

## About
Parse a subset of url blocking rules in the ad-block rule format.

## Why
Other alternatives are heavy and require gyp-rebuilds etc.

## For who?
Those who want a simple but better than average ad-blocking.

## How
Using plain JavaScript we parse some (not all) of the basic rule formats
and use primarily String.indexOf() to seek for matches ( indexOf
is an order of magnitude faster than traditional for-loops,
at least on V8 )

ref: https://help.eyeo.com/en/adblockplus/how-to-write-filters#introduction

## Alternatives
[ad-block](https://www.npmjs.com/package/ad-block)

## Test

#### test (and benchmark) indexOf version
```
npm test
```

#### test (and benchmark) for-loop version
```
node test/test-for-loop.js
```


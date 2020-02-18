const test = require( 'tape' )

const abjs = require( './for-loop.js' )

function testRule ( rule, url ) {
  const client = abjs.create()
  client.add( rule )
  return client.matches( url )
}

test( 'basic ( *foo* == foo )', function ( t ) {
  const url = 'http://example.com/foo/bar.gif'

  t.ok( testRule( 'example.com', url ) )
  t.ok( testRule( 'example', url ) )
  t.ok( testRule( 'example*', url ) )
  t.ok( testRule( '*example', url ) )
  t.ok( testRule( '*example*', url ) )
  t.end()
} )

test( 'beginning + end of address ( |foo + bar| )', function ( t ) {
  const url = 'http://example.com/foo/bar.gif'

  t.ok( testRule( 'example.com', url ) )
  t.ok( testRule( 'example', url ) )
  t.ok( testRule( 'http', url ) )
  t.ok( testRule( '|http', url ) )
  t.ok( testRule( 'bar.gif|', url ) )
  t.ok( testRule( '*.gif|', url ) )

  t.ok( !testRule( '|https', url ) )
  t.ok( !testRule( '|example.com', url ) )
  t.ok( !testRule( 'bar.gif/|', url ) )

  t.end()
} )

test( 'domain ( ||example.com )', function ( t ) {
  const http = 'http://example.com/foo/bar.gif'
  const https = 'https://example.com/foo/bar.gif'
  const http_www = 'http://www.example.com/foo/bar.gif'
  const https_www = 'https://www.example.com/foo/bar.gif'

  t.ok( testRule( '||example.com', http ) )
  t.ok( testRule( '||example.com', https ) )
  t.ok( testRule( '||example.com', http_www ) )
  t.ok( testRule( '||example.com', https_www ) )
  t.end()
} )

test( 'separators ( example.com^ )', function ( t ) {
  const url = 'http://example.com:8000/foo.bar?a=12&b=%D1%82%D0%B5%D1%81%D1%82'

  t.ok( testRule( '^foo.bar^', url ) )
  t.ok( testRule( 'foo.bar^', url ) )
  t.ok( testRule( '^foo.bar', url ) )
  t.ok( testRule( '^example.com^', url ) )
  t.ok( testRule( '^%D1%82%D0%B5%D1%81%D1%82^', url ) )

  t.end()
} )

test( 'advanced samples', function ( t ) {
  const url = 'http://example.com/foo/bar.gif'

  t.ok( !testRule( 'bar.gif/|', url ) )
  t.ok( testRule( 'bar.gif^|', url ) )

  const http = 'http://example.com/foo/bar.gif'
  const https = 'https://example.com/foo/bar.gif'
  const http_www = 'http://www.example.com/foo/bar.gif'
  const https_www = 'https://www.example.com/foo/bar.gif'

  t.ok( testRule( '||example.com*bar.gif', http ) )
  t.ok( testRule( '||example.com*bar.gif^', https ) )
  t.ok( testRule( '||example.com*foo^bar.gif', https_www ) )
  t.ok( testRule( '||example.com*foo/bar.gif', https_www ) )

  t.ok( !testRule( '||example.com*bar.gif/', http_www ) )
  t.ok( !testRule( '||example.com*foo^bar^gif', https_www ) )

  t.end()
} )

test( 'benchmark', function ( t ) {
  const fs = require( 'fs' )
  const path = require( 'path' )
  const rules = (
    fs.readFileSync( path.join( __dirname, './easylist.txt' ), 'utf8' )
    .split( /\r?\n\r?/ )
  )

  const urls = (
    fs.readFileSync( path.join( __dirname, './urls.txt' ), 'utf8' )
    .split( /\r?\n\r?/ )
  )

  const client = abjs.create()

  for ( let i = 0; i < rules.length; i++ ) {
    const rule = rules[ i ]
    client.add( rule )
  }


  const startTime = Date.now()

  for ( let i = 0; i < urls.length; i++ ) {
    const url = urls[ i ]

    const now = Date.now()
    client.matches( url )
    const delta = Date.now() - now
    t.comment( 'url: ' + url )
    t.comment( 'took: ' + delta + ' ms' )
  }

  const delta = Date.now() - startTime
  t.comment( 'total time: ' + delta + ' ms' )

  t.ok( delta < 1000, 'benchmark acceptable' )
  t.end()
} )

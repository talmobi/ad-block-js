const _envs = {}
Object.keys( process.env ).forEach(
  function ( key ) {
    const n = process.env[ key ]
    if ( n == '0' || n == 'false' || !n ) {
      return _envs[ key ] = false
    }
    _envs[ key ] = n
  }
)

module.exports.testRule = testRuleText

function debugLog ( ...args ) {
  if ( !_envs.debug_ad_block_js ) return
  console.log.apply( this, args )
}

// parse easylist rules
// ref: https://help.eyeo.com/en/adblockplus/how-to-write-filters#introduction
function testRuleText ( rule, url ) {
  if ( rule[ 0 ] === '!' ) {
    // comment
    return false
  }

  let hasStart = false
  let hasEnd = false

  if ( rule.indexOf( '@@' ) === 0 ) {
    // exception rule
    rule = rule.slice( 2 )
    // TODO
  } else if ( rule[ 0 ] === '|' && rule[ 1 ] === '|' ) {
    // domain name
    rule = rule.slice( 2 )

    // normalize rule
    if ( rule.indexOf( 'https://' ) === 0 ) {
      rule = rule.slice( 'https://' )
    }
    if ( rule.indexOf( 'http://' ) === 0 ) {
      rule = rule.slice( 'http://' )
    }
    if ( rule.indexOf( 'www.' ) === 0 ) {
      rule = rule.slice( 'www.' )
    }

    // normalize url
    if ( url.indexOf( 'https://' ) === 0 ) {
      url = url.slice( 'https://' )
    }
    if ( url.indexOf( 'http://' ) === 0 ) {
      url = url.slice( 'http://' )
    }
    if ( url.indexOf( 'www.' ) === 0 ) {
      url = url.slice( 'www.' )
    }
  } else if ( rule[ 0 ] === '|' ) {
    // beginning
    hasStart = true
    rule = rule.slice( 1 )
  } else if ( rule[ rule.length - 1 ] === '|' ) {
    // end
    hasEnd = true
    rule = rule.slice( 0, -1 )
  }

  debugLog( 'hasStart: ' + hasStart )
  debugLog( 'hasEnd: ' + hasEnd )

  // basic rule
  if ( !hasStart && rule[ 0 ] !== '*' ) {
    rule = '*' + rule
  }
  if ( !hasEnd && rule[ rule.length - 1 ] !== '*' ) {
    rule = rule + '*'
  }

  debugLog( 'rule: ' + rule )

  const chunks = rule.split( /\*+/ ).filter( function ( i ) { return i } )

  let lastIndexOf = 0
  chunk_loop:
  for ( let i = 0; i < chunks.length; i++ ) {
    debugLog( 'lastIndexOf: ' + lastIndexOf )

    const chunk = chunks[ i ]
    if ( chunk === '' ) continue
    debugLog( 'chunk: ' + chunk )

    // used to decrease final length by 1
    // when separator ( ^ ) matches EOL
    let hasEOL = false

    let matching = false
    url_loop:
    for ( let j = 0; j < url.length; j++ ) {
      matching = false

      for ( let k = 0; k < chunk.length; k++ ) {
        const c = chunk[ k ]
        let u = url[ j + k ]

        // handle EOL
        if ( ( j + k ) === url.length ) {
          hasEOL = true
          u = '\n'
        }

        if ( !u ) return false // out of scope

        if ( ruleCharMathes( c, u ) ) {
          debugLog( 'matches: ' + c )
          matching = true
          continue
        } else {
          hasEOL = false
          matching = false
          debugLog( 'nomatch: ' + c )
          continue url_loop
        }
      }

      if ( !matching ) return false

      debugLog( ' matching done.' )

      // matches
      const indexOf = j
      debugLog( 'indexOf: ' + indexOf )
      debugLog( 'lastIndexOf: ' + lastIndexOf )

      if ( indexOf < lastIndexOf ) return false
      lastIndexOf = indexOf

      const firstChunk = ( i === 0 )
      const lastChunk = ( i === ( chunks.length - 1 ) )

      if ( hasStart && firstChunk ) {
        if ( indexOf !== 0 ) return false
      }

      if ( hasEnd && lastChunk ) {
        let extra = 0
        if ( hasEOL ) extra = 1
        if (
          indexOf !== ( url.length - chunk.length + extra )
        ) return false
      }

      continue chunk_loop
    }

    if ( !matching ) return false
  }

  // all chunks done and everything OK
  return true
}

function successiveMatches ( matches, text ) {
  let n = 0
  for ( let i = 0; i < matches.length; i++ ) {
    const match = matches[ i ]
    const indexOf = text.indexOf( match, n )
    if ( indexOf < 0 ) return false
    n = indexOf
  }
  return true
}

function ruleCharMathes ( a, b ) {
  if ( a === '^' ) {
    return (
      b === '/' ||
      b === ':' ||
      b === '?' ||
      b === '=' ||
      b === '&' ||
      b === '\n'
    )
  }
  return a === b
}

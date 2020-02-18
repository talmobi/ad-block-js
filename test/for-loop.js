// old for-loop version, the new indexOf version is an order of
// magnitude faster

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

module.exports = create
module.exports.create = create
module.exports.testRule = testRuleText

function create ( options ) {
  options = options || {}
  if ( typeof options !== 'object' ) throw new Error( 'options has to be an object' )

  const api = {
    rawRules: [],
    rules: []
  }

  api.parse = api.add = function add ( rule ) {
    api.rawRules.push( rule )

    rule = rule.trim()
    rule = rule.replace( /[\r\n]/g, '' ) // replace all new-lines

    if ( rule[ 0 ] === '!' ) {
      // comment, ignore
      return
    }

    const r = {
      hasStart: false,
      hasEnd: false,
      text: rule
    }

    if ( rule.indexOf( '##' ) >= 0 ) {
      // element hide rule, not supported
      return
    } else if ( rule.indexOf( '@@' ) === 0 ) {
      // exception, not supported
      return
    } else if ( rule[ 0 ] === '|' && rule[ 1 ] === '|' ) {
      // domain
      r.domain = true
      let text = rule.slice( 2 )

      // normalize rule
      r.text = normalizeDomain( text )
    } else if ( rule[ 0 ] === '|' ) {
      // start
      r.hasStart = true
      r.text = rule.slice( 1 )
    } else if ( rule[ rule.length - 1 ] === '|' ) {
      // end
      r.hasEnd = true
      r.text = rule.slice( 0, -1 )
    }

    // options are not supported atm, so parse them away
    const lastDollarIndex = r.text.lastIndexOf( '$' )
    if ( lastDollarIndex >= 0 ) {
      r.text = r.text.slice( 0, lastDollarIndex )
      return
    }

    // regex not supported, so ignore them
    if ( r.text[ 0 ] === '/' && r.text[ r.text.length - 1 ] === '/' ) {
      return
    }

    const chunks = r.text.split( /\*+/ ).filter( function ( i ) { return i } )

    r.chunks = chunks

    api.rules.push( r )
  }

  api.matches = function matches ( url ) {
    for ( let i = 0; i < api.rules.length; i++ ) {
      const r = api.rules[ i ]
      const matches = testRuleObject( r, url )
      if ( matches ) return true
    }

    return false
  }

  return api
}

function testRuleObject ( r, url ) {
  const chunks = r.chunks
  const hasStart = r.hasStart
  const hasEnd = r.hasEnd

  if ( r.domain ) {
    url = normalizeDomain( url )
  }

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

function normalizeDomain ( text ) {
  if ( text.indexOf( 'https://' ) === 0 ) {
    text = text.slice( 'https://'.length )
  }
  if ( text.indexOf( 'http://' ) === 0 ) {
    text = text.slice( 'http://'.length )
  }
  if ( text.indexOf( 'www.' ) === 0 ) {
    text = text.slice( 'www.'.length )
  }
  return text
}

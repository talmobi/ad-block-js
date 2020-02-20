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

    // ignore rules that are too short
    if ( rule.length <= 3 ) return

    if ( rule[ 0 ] === '!' ) {
      // comment, ignore
      return
    }

    const r = {
      hasStart: false,
      hasEnd: false,
      rule: rule,
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

    // ignore patterns that are too short
    if ( r.text.length <= 3 ) return

    const chunks = r.text.split( /\*+/ ).filter( function ( i ) { return i } )

    r.items = []

    for ( let i = 0; i < chunks.length; i++ ) {
      const chunk = chunks[ i ]
      const seps = chunk.split( '^' )
      if ( seps.length > 0 ) {
        for ( let i = 0; i < seps.length; i++ ) {
          const t = seps[ i ]
          if ( t === '' ) continue
          const last = seps[ i - 1 ]
          const next = seps[ i + 1 ]

          r.items.push( {
            text: t,
            before: last !== undefined,
            after:  next !== undefined
          } )
        }
      } else {
        r.items.push( {
          text: chunk,
          before: false,
          after: false
        } )
      }
    }

    api.rules.push( r )
  }

  api.matches = function matches ( url ) {
    const cache = {}
    for ( let i = 0; i < api.rules.length; i++ ) {
      const r = api.rules[ i ]
      const matches = testRuleObject( r, url, cache )
      if ( matches ) return true
    }

    return false
  }

  return api
}

function testRuleObject ( r, url, cache ) {
  const items = r.items

  if ( r.domain ) {
    debugLog( ' === domain === ' )

    if ( cache.domainUrl ) {
      url = cache.domainUrl
    } else {
      url = normalizeDomain( url )
      cache.domainUrl = url
    }
  }

  debugLog( 'rule: ' + r.rule )
  debugLog( 'url: ' + url )

  let position = -1
  for ( let i = 0; i < items.length; i++ ) {
    const item = items[ i ]

    const indexOf = url.indexOf( item.text, position + 1 )
    if ( indexOf <= position ) return false
    position = indexOf

    debugLog( 'text: ' + item.text )
    debugLog( 'position: ' + position )

    if ( r.hasStart && i === 0 ) {
      if ( indexOf !== 0 ) return false
    }

    if ( r.hasEnd && i === ( items.length - 1 ) ) {
      let len = url.length - item.text.length
      if ( indexOf !== len ) return false
    }

    if ( item.before ) {
      debugLog( 'before: ' + url[ position - 1 ] )
      if ( !isSeparator( url[ position - 1 ] ) ) return false
    }

    if ( item.after ) {
      const n = position + item.text.length
      debugLog( 'after: ' + url[ n ] )
      if (
        url[ n ] !== undefined && // EOL OK
        !isSeparator( url[ n ] )
      ) return false
    }
  }

  debugLog( 'passed rule: ' + r.rule )

  // all chunks done and everything OK
  return true
}

function iterativeIndexOf ( text, pattern ) {
  let results = []
  let matchIndex = text.indexOf( pattern )
  while ( matchIndex !== -1 ) {
    results.push( matchIndex )
    matchIndex = text.indexOf( pattern, matchIndex + 1 )
  }
  return results
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
    rule = normalizeDomain( rule )

    // normalize url
    url = normalizeDomain( url )
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

function isSeparator ( a ) {
  return (
    a === '/' ||
    a === ':' ||
    a === '?' ||
    a === '=' ||
    a === '&'
  )
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

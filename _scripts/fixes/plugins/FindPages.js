var request = require( 'request' );

function FindPages() {
}

FindPages.prototype.process = function( fixConfig, post, listener ) {
  // console.log( 'FindPages', post.fileName );

  if( post.config.layout !== 'page' ) {
    listener.success( post );
    return;
  }

  var url = post.config.wordpress_url;
  console.log( 'original url', (url? url: 'NOT SET') );
  if( !url ||
      url === fixConfig.baseUrl ||
      !post.config.title ) {
    return ignorePage( url, post, fixConfig, listener );
  }
  else if( url.indexOf( '?page_id=' ) !== -1 ) {
    return processQueryUrl( url, post, fixConfig, listener );
  }
  else {
    return processFullUrl( url, post, fixConfig, listener );
  }

};

function ignorePage( url, post, fixConfig, listener ) {
  post.outputDir = '_ignore/';

  listener.success( post );
  return;
}

function processFullUrl( url, post, fixConfig, listener ) {
  console.log('Processing query URL %s for post %s', url, post.fileName );

  // full URL: use that and move the file to that location
  var path = url.replace( fixConfig.baseUrl, '' );
  post.config.permalink = path;
  post.outputDir = 'pages/';

  listener.success( post );
  return;
}

function processQueryUrl( url, post, fixConfig, listener ) {
  // If query URL, make query see 301 and use that URL
  request( {
    uri: url,
    followRedirect: false
  }, function( err, res, body ) {
    if( err ) {
      listener.fail( err );
    }

    console.log( 'status code:', res.statusCode );
    // console.log( res.headers );

    if( res.statusCode === 301 ) {
      url = res.headers.location;
    }

    var path = url.replace( fixConfig.baseUrl, '' );

    console.log( 'Setting path', path );

    post.config.permalink = ensureEndsWith( path, '/' );
    post.outputDir = 'pages/';

    listener.success( post );
    return;
  } );
}

function endsWith( check, str ) {
  var lastIndex =  check.lastIndexOf( str );
  return ( ( lastIndex + str.length ) >= check.length );
}

function ensureEndsWith( check, str ) {
  if( endsWith( check, str ) === false ) {
    check += str;
  }
  return check;
}

module.exports = FindPages;

var request = require( 'request' );

function Permalink() {
}

Permalink.prototype.process = function( fixConfig, post, listener ) {

  if( post.config.layout !== 'post' ) {
    listener.success( post );
    return;
  }

  var originalUrl = post.config.wordpress_url;
  console.log( 'file:', post.fileName );
  console.log( 'originalUrl:', originalUrl );

  if( originalUrl.indexOf( '?p=' ) === -1 ) {
    console.log( 'No query URL indicates not a redirect URL.' +
                 'Using original URL', originalUrl );
    update( originalUrl, fixConfig, post, listener );
  }
  else {

    request( {
      uri: originalUrl,
      followRedirect: false
    }, function( err, res, body ) {
      if( err ) {
        post.outputDir = '_ignore/';
        listener.fail( err );
      }

      console.log( 'status code:', res.statusCode );
      // console.log( res.headers );

      if( res.statusCode === 301 ) {
        originalUrl = res.headers.location;
      }
      else if( res.statusCode === 404 ) {
        post.outputDir = '_ignore/';
      }

      update( originalUrl, fixConfig, post, listener );
    } );

  }

};

function update( url, fixConfig, post, listener ) {
  var path = url.replace( fixConfig.baseUrl, '' );
  var oldPath = post.config.permalink;
  post.config.permalink = path;

  console.log(
    'Updated permalink\n' +
    '\tFrom: ' + (oldPath?'':'NOT SET') + '\n' +
    '\tTo: ' + post.config.permalink
  );

  listener.success( post );
}


module.exports = Permalink;

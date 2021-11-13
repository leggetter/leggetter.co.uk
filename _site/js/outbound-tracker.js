( function() {
  function trackOutboundLink( ev ) {

    var isLinux = ( navigator.userAgent.toLowerCase().indexOf( 'linux' ) !== -1 );
    var el = jQuery( ev.srcElement || ev.target );
    var href = el.attr( 'href' ) || '';
    var fullUrl = /^https?:\/\//.test( href );
    var leggetterLink = /^https?:\/\/www.leggetter.co.uk/.test( href );
    if( !fullUrl || leggetterLink ) {
      log( 'not tracking internal link' );
      return;
    }

    var category = 'outbound';
    var action = href;
  
    try {
      var trackEv = [ '_trackEvent' , category, action ];
      log( '_trackEvent', trackEv );
      _gaq.push( trackEv  ); 
      log( 'tracked event' );
    } catch(err){}
    
    // For the moment don't try to do anything clever for 
    // Linux due to https://code.google.com/p/chromium/issues/detail?id=95874
    if( !isLinux && !ev.metaKey ) {
      ev.preventDefault();
 
      setTimeout(function() {
        document.location.href = href;
      }, 100);
    }
  }

  jQuery( 'a' ).on( 'click', trackOutboundLink );

  function log( msg ) {
    if( console && console.log ) {
      console.log( msg );
    }
  }

} )();
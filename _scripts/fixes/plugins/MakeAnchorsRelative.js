function MakeAnchorsRelative() {
}

MakeAnchorsRelative.prototype.process = function( fixConfig, post, listener ) {
  // TODO: use fixConfig.baseUrl
  var anchorMatch = /(src|href)="http\:\/\/www.leggetter.co.uk(\/(.*?))"/gm;
  var hasAnchor = anchorMatch.test( post.content );
  console.log('has leggetter anchor', hasAnchor);
  if( hasAnchor ) {
    post.content = post.content.replace( anchorMatch, '$1="$2"');
  }
  listener.success( post );
  return;
};

module.exports = MakeAnchorsRelative;

function FindIgnores() {
}

FindIgnores.prototype.process = function( fixConfig, post, listener ) {
  var hasTitle = post.config.title;
  var hasContent = post.content && post.content.trim();

  console.log('has title', hasTitle, 'has content', hasContent);


  if( !post.config.title ||
      !post.content ||
      !post.content.trim() ) {
    console.log('ignoring', post);
    post.outputDir = '_ignore/';
  }
  listener.success( post );
  return;
};

module.exports = FindIgnores;

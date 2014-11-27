function StripSensitiveData() {
}

StripSensitiveData.prototype.process = function( fixConfig, post, listener ) {
  delete post.config.comments;
  delete post.config.author.login;
  delete post.config.author_login;
  listener.success( post );
  return;
};

module.exports = StripSensitiveData;

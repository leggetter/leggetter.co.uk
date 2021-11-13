function PresPres(ui, presentationName) {
  PresPres.lastInstance = this;

  Pusher.log = PresPres.bindTo(this, this.log);
  
  this.pusher = new Pusher('a71b8d8b7eef0ef6d98c');

  this.channelName = 'presence-' + presentationName;
  
  this.ui = ui;
  this.ui.userJoin = PresPres.bindTo(this, this._userJoin);
};

PresPres.prototype._userJoin = function() {
  this.whosOnline = this.pusher.subscribe(this.channelName);
  this.whosOnline.bind('pusher:subscription_succeeded', PresPres.bindTo(this, this._subscriptionSucceeded));
  this.whosOnline.bind('pusher:member_added', PresPres.bindTo(this.ui, this.ui.addMember));
  this.whosOnline.bind('pusher:member_removed', PresPres.bindTo(this.ui, this.ui.removeMember));
  this.whosOnline.bind('pusher:before_auth', PresPres.bindTo(this, this._beforeAuth));
};

PresPres.prototype._subscriptionSucceeded = function(members){
  var self = this;
  members.each(function(member) {
    self.ui.addMember(member);
  });
};

PresPres.prototype._beforeAuth = function(evt){
  evt.data.username = this.ui.username;
};

PresPres.prototype.log = function(msg) {
  if(console && console.log) {
    console.log(msg)
  }
};

PresPres.bindTo = function(obj, func){
  return function() {
    func.apply(obj, arguments);
  };
};

function PresPresUI() {
  PresPresUI.lastInstance = this;
  
  var self = this;
  
  this.memberCount = 0;
  this.userJoin = null;
  this.username = null;
  
  $('#imOnline').submit(function() {
    var username = $.trim( $('#username').val() );
    if(username.length > 3) {
      
      self.join(username);
      
      $('#join').slideUp();
    }
    else {
      alert("Please provide at least a 3 character name for yourself.")
    }
    return false;
  });
}

PresPresUI.prototype.join = function(username) {
  if(username.length > 3) {
    
    this.username = username;
    
    if(typeof this.userJoin === "function") {
      this.userJoin(username);
    }
  }
  else {
    alert("Please provide at least a 3 character name for yourself.")
  }
};

PresPresUI.prototype.addMember = function(member) {
  if(this.memberCount === 0) {
    $('.whos-online ul').html('');
  }
  ++this.memberCount;
  
  var li = $('<li data-user-id="' + member.id + '">' + member.id + '</li>');
  //li.hide();
  $('.whos-online ul').append(li);
  //li.slideDown();
  
  $('.whos-online .count').text(this.memberCount);
};

PresPresUI.prototype.removeMember = function(member) {
  var li = $('.whos-online ul li[data-user-id="' + member.id + '"]');
  li.fadeOut('slow');
};
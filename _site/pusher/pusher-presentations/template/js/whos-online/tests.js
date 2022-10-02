$(function() {
  
  var presPres = PresPres.lastInstance;
  var ui = presPres.ui;
  if(presPres.pusher.test) {
  
    var presenceChannelName = PresPres.lastInstance.channelName;
  
    presPres.pusher.test.bind('test:channel_subscribed', function(channel) {
      if(channel.name === presenceChannelName) {
        var members = new pusherjs.test.framework.Members();
        members.add({id: ui.username, info: {}});
        Pusher.dispatch(presenceChannelName, 'pusher:subscription_succeeded', members);
      }
    });
  
    window.addUser = function(name) {
      Pusher.dispatch(presenceChannelName, 'pusher:member_added', {id: name, info:{}});
    };
  }
  
});
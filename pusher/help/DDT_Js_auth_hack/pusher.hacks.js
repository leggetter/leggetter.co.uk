if(typeof PusherHacks === 'undefined') {
  PusherHacks = {};
  
  PusherHacks.AuthHack = function(applicationSecret) {
    PusherHacks.AuthHack._applicationSecret = applicationSecret;
  }
  PusherHacks.AuthHack.prototype.authHack = function(pusher, callback) {
    var channelName = this.name;
    var socketId = pusher.connection.socket_id;
    var stringToSign = socketId + ":" + channelName;
    var hmac = Crypto.HMAC(Crypto.SHA256, stringToSign, PusherHacks.AuthHack._applicationSecret);
    var authString = pusher.key + ":" + hmac;
    var auth =  {auth:authString};
    callback(false, auth);
  };
  
  PusherHacks._loadDependencies = function(options, callback) {
    var scripts = document.getElementsByTagName("script");
    var root = options.scriptRoot;
    if(!root) {
      var script = null;
      for(var i = 0, l = scripts.length; i < l; ++i) {
        script = scripts[i];
        if(script.src && script.src.match(/pusher\.hacks\.js$/)) {
          root = script.src.substring(0, script.src.indexOf("pusher.hacks.js"));
        }
      }
    }
    // LAB.js loader
    (function(g,b,d){var c=b.head||b.getElementsByTagName("head"),D="readyState",E="onreadystatechange",F="DOMContentLoaded",G="addEventListener",H=setTimeout;
    function f(){
       $LAB
          .script("http://crypto-js.googlecode.com/files/2.2.0-crypto-sha256.js")
          .script("http://crypto-js.googlecode.com/files/2.2.0-hmac-min.js").wait(callback);
    }
    H(function(){if("item"in c){if(!c[0]){H(arguments.callee,25);return}c=c[0]}var a=b.createElement("script"),e=false;a.onload=a[E]=function(){if((a[D]&&a[D]!=="complete"&&a[D]!=="loaded")||e){return false}a.onload=a[E]=null;e=true;f()};
    a.src=root + "LAB.min.js";
    c.insertBefore(a,c.firstChild)},0);if(b[D]==null&&b[G]){b[D]="loading";b[G](F,d=function(){b.removeEventListener(F,d,false);b[D]="complete"},false)}})(this,document);
  };
  
  PusherHacks.hack = function(options) {
    // options.scriptRoot
    // options.applicationSecret
    
    PusherHacks._loadDependencies(options, function() {
      var hacks = new PusherHacks.AuthHack(options.applicationSecret);
      Pusher.authorizers.authHack = hacks.authHack;
      Pusher.channel_auth_transport = "authHack";
    });
  };
}
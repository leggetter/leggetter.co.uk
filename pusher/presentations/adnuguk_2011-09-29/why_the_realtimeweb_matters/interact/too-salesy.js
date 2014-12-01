$(function() {
  
  Pusher.log = function(msg) {
    if(console && console.log) {
      console.log(msg);
    }
  };
  
  var href = document.location.href;
  href = href.replace(document.location.hash, "");
  var presentationName = href.substring(href.lastIndexOf("/") + 1, href.lastIndexOf("."));
  
  var pusher = new Pusher('a71b8d8b7eef0ef6d98c');
  
  var channelName = 'salesy-' + presentationName;
  var salesyChannel = pusher.subscribe(channelName);
  
  var state = "none";
  
  salesyChannel.bind('new_vote', function(data) {

    var neck = $('#interact .thermometer .neck');
    var currentWidth = parseInt(neck.css("width"), 10);
    currentWidth += data.amount;
    
    neck.animate({width: currentWidth + "px"});
    
    if(currentWidth === 30) {
      setState("careful")
    }
    else if(currentWidth === 50) {
      setState("caution");
    }
    else if(currentWidth === 70) {
      setState("warning");
    }
    else if(currentWidth === 90) {
      setState("failing");
    }
    else if(currentWidth >= 100) {
      setState("failed");
      var therm = $('#interact .thermometer');
      therm.html("Phil is a salesman");
    }
    
    $("#interact .percent").text(currentWidth + "%");
  });
  
  function setState(newState) {
    var therm = $('#interact .thermometer');        
    therm.removeClass(state);
    state = newState;
    therm.addClass(state);
  }
});
$(function() {
  
  Pusher.log = Pusher.log || function(msg) {
    if(console && console.log) {
      console.log(msg);
    }
  };
  
  var href = document.location.href;
  href = href.replace(document.location.hash, "");
  var presentationName = href.substring(href.lastIndexOf("/") + 1, href.lastIndexOf("."));
  
  var pusher = Pusher.instances[0] || new Pusher('a71b8d8b7eef0ef6d98c');
  
  var channelName = 'questions-' + presentationName;
  var questionChannel = pusher.subscribe(channelName);
  
  questionChannel.bind('new_question', function(data) {
    
    var asker = data.asker;
    var question = data.question;

    $.gritter.add({
    	title: asker + " asks...",
    	text: question,
    	sticky: true, 
    });
  });
});
$(function() {
  var pusher = new Pusher('c9f5043738b6f7e428fa');
  var channel = pusher.subscribe('racing_channel');
  channel.bind('race_data_updated', function(data) {
    $('#exampleScript1 div p').html(data.commentary);
    $('#exampleScript1 div.first span').html(data.position1);
    $('#exampleScript1 div.second span').html(data.position2);
    $('#exampleScript1 div.third span').html(data.position3);        
  });
})();
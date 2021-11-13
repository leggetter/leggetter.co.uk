$(function() {
  
  $(".entrybody aside").each(function(index, el) {
    var wrapper = $("<div class='dynamic-info'></div>");
    el = $(el);
    var header = el.find("h4");
    var headerClone = header.clone();
    header.remove();
    el.wrap(wrapper);
    
    var newWrapper = el.parent();
    newWrapper.prepend(headerClone);
    
    var originalWidth = newWrapper.css("width");
    headerClone.click(function() {
      var displayed = (el.css("display") !== "none");
      if(displayed) {
        newWrapper.animate({
          width: originalWidth,
          float: "right"
        });
        el.fadeOut();
      }
      else {
        newWrapper.animate({
          width: "95%",
          float: "none"
        }); 
        el.fadeIn();
      }

    });
  })
});
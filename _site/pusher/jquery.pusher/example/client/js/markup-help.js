$("#simpleMarkupExample1").text( thisHtml($("#simpleExample1")) );
$("#simpleMarkupExample2").text( thisHtml($("#simpleExample2")) );
$.ajax({
  url: "js/example-plugin.js",
  success: function(data) {
    var str = thisHtml( $("#simpleExample3") );
    str += "\n<scr" + "ipt>\n" + data + "\n</scr" + "ipt>";
    //
    
    $("#simpleMarkup3").text(str);
  },
  dataType: "text"
});
$.ajax({
  url: "js/example-script.js",
  success: function(data) {
    var str = thisHtml( $("#scriptExample1") );
    str += "\n<scr" + "ipt>\n" + data + "\n</scr" + "ipt>";
    $("#scriptMarkup1").text(str);
  },
  dataType: "text"
});

function thisHtml(el) {
  var el = $("<div />").append(el.clone());
  return "\t" + el.html();
}

$(function(){
  setTimeout(function(){
    $("pre.html").snippet("html", {style:"darkness"});
  }, 500);
});
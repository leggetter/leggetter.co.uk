---
layout: post
status: publish
published: true
title: Considerations when updating the DOM to display realtime data
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 22632
wordpress_url: "http://www.leggetter.co.uk/?p=22632"
date: "2012-02-12 15:18:26 +0000"
date_gmt: "2012-02-12 15:18:26 +0000"
categories:
  - Technology
tags:
  - api-fanboy
permalink: /2012/02/12/considerations-when-updating-the-dom-to-display-realtime-data.html
---

<p>When data is being delivered to web applications the chances are that you'll be displaying that data within the user interface (UI). In order to do this you need to find the element in the <a href="http://en.wikipedia.org/wiki/Document_Object_Model">Document Object Model</a> (DOM) and then update it. Whilst the performance of web browsers is improving all the time DOM manipulation can still be costly (use up time and resources) if you are pushing through a lot of data so it's worth keeping the interaction with the DOM to a minimum. You should also consider how you access the DOM. Should you use a utility/library function or should you use native browser methods?</p>

<p>To demonstrate this, and show the considerations I've written a few small helper functions which can be called a number of times from tests and for each test I'll time how long it takes to update the DOM a certain number of times.</p>

<p>For many web developers a script tag referencing in the jQuery library is one of the first elements to be added to any web page - it's even in some web framework templates by default. So, a good first test is to time how long it takes for jQuery to update an element a number of times.</p>

<script src="//ajax.googleapis.com/ajax/libs/jquery/1.8/jquery.min.js"></script>

<pre><code class="js" data-code='testDefinitions_jQueryNoCache'></code></pre>

<script data-code-target="testDefinitions_jQueryNoCache">
var methods = {};
var elId = 'updateMe';
methods.jQueryNoCache = function(value) {
  jQuery('#' + elId).text(value);
};
</script>

<p>Now that we've defined one way of updating the DOM let's add a way of caching a reference to the jQuery object that we create with the <code>jQuery(selector)</code> call. So, instead of having to make that call each time we can just access the object from a cache. This means that a new <code>jQuery</code> object doesn't need to be created for every update.</p>

<pre><code class="js" data-code='testDefinitions_jQueryCache'></code></pre>

<script data-code-target="testDefinitions_jQueryCache">
var cache = {};
methods.jQueryCache = function(value) {
  if(!cache['#' + elId]) {
    cache['#' + elId] = jQuery('#' + elId);
  }
  cache['#' + elId].text(value);
};
</script>

<p>jQuery uses CSS selectors to find elements so rather than going directly to single elements using <code>id</code> attributes let's also define a test that uses a nested selector: <code>div.top div.middle div.bottom p.update-me</code>.</p>

<pre><code class="js" data-code="testDefinitions_jQueryCSSSelectorNoCache"></code></pre>

<script data-code-target="testDefinitions_jQueryCSSSelectorNoCache">
  var elCSSSelector = 'div.top div.middle div.bottom p.update-me';
  methods.jQueryCSSSelectorNoCache = function(value) {
   jQuery(elCSSSelector).text(value);
  };
</script>

<div class="top" style="width: 5px; height: 5px; overflow: hidden;">
  <div class="middle">
    <div class="bottom">
      <p class="update-me"></p>
    </div>
  </div>
</div>


<p>Finally, as a comparison let's define functions which update the DOM by directly using the native <code>document.getElementById</code> and <code>document.querySelector</code> native browser functions, and both of these again using the caching technique we used earlier.</p>

<pre><code class="js" data-code='testDefinitions_byId'></code></pre>

<script data-code-target="testDefinitions_byId">
methods.byIdNoCache = function(value) {
  document.getElementById(elId).innerText = value;
};
methods.querySelectorNoCache = function(value) {
  document.querySelector(elCSSSelector).innerText = value;
};
methods.byIdCache = function(value) {
  if(!cache[elId]) {
    cache[elId] = document.getElementById(elId);
  }
  cache[elId].innerText = value;
};
methods.querySelectorCache = function(value) {
  if(!cache[elCSSSelector]) {
    cache[elCSSSelector] = document.querySelector(elCSSSelector);
  }
  cache[elId].innerText = value;
};
</script>

<p>If we execute each of these methods so that they are called 500 times to update the DOM and repeat that 10 times we see results as shown in the following graph.</p>

<figure>
  <div id="timeSeriesChart"></div>

  <figcaption style="font-size: 10px; padding-top: 5px;">Time in milliseconds (y-axis) it takes to update an element within the DOM <span id="updateMe"></span>(+1) times. The test is ran a number of times (x-axis)</figcaption>
</figure>

<p>And if we take each of the results and average them out we see the following:</p>

<figure>
  <div id="avgSeriesChart"></div>
  <figcaption style="font-size: 10px; padding-top: 5px;">The chart above shows the average time it takes to find the element and update the DOM using different techniques</figcaption>
</figure>

<aside style="width: 300px; float: right; background-color: #F8F8F8; border: 1px #CCC solid; padding: 1em; -moz-border-radius: 5px; -webkit-border-radius: 5px; border-radius: 5px; font-size: 12px; margin-left: 20px; padding-bottom: 0;">

<fieldset>
<legend><strong>Run DOM Manipulation Tests</strong></legend>
  <label for='numUpdates'>How many updates per test?</label>
  <input id="numUpdates" type="number" value="500" max="2500" required="required" /><small>(2500 max)</small>
  <label for="numLoops">How many times should each test be run?</label>
  <input id="numLoops" type="number" value="10" max="25" required="required" /><small>(25 max)</small>
  <button id="runTestsBtn">Run Tests</button>
</fieldset>

<p>If you'd like to try running the tests with different numbers you can do so using this form. When the tests complete the graphs will update. The numbers have been restricted in an effort to reduce the chances of your web browser hanging.
</aside>

<script>
$(function() {
  $('#runTestsBtn').click(function() {
    var updates = $('#numUpdates').val();
    var loop = $('#numLoops').val();
    if(isNaN(updates) || isNaN(loop)) {
      return;
    }
    updates = Math.min(updates, 2500);
    loop = Math.min(loop, 25);
    runTests(updates, loop);
  });
})
</script>

<h3>Conclusion</h3>
<p>The graphs are dynamically generated based on the browser viewing this blog post so the results will differ but even so the graphs suggest to following to me:</p>

<ul>
<li>If you are sending a reasonable number of updates, and you are going to be updated the UI a lot, that you should be using <code>document.getElementById</code> to access and update the DOM.</li>
<li>If you want to use jQuery and the DOM structure isn't going to update all that often then the caching references to jQuery objects is an efficient mechanism.</li>
<li>If you are are using CSS queries then the native <code>document.querySelector</code> performs better than <code>jQuery</code>. In both cases the complexity of the query is undoubtedly going to impact the performance.</li>
<li>Caching lookups of <code>document.querySelector</code> is a good idea since it improves performance.</li>
<li>Unsurprisingly direct <code>id</code> attributes lookups are fastest of all.</li>
<li><code>document.getElementById</code> is the fastest way of accessing the DOM and caching lookups doesn't make a big difference.</li>
</ul>

<p>The important thing is that you will know better than anybody else the sort of data that is going to be pushed into your app and it does with it. Balance performance and maintainability within your application and make decisions about how you are going to deal with updating the DOM based on that.</p>
<p>If your application gets infrequent updates then you'll be fine using jQuery all the time. If your app gets a lot of realtime data streamed to it, maybe it's a trading application, then you'll need to fine-tune your app.</p>

<script src="//leggetter.github.com/script-cdn/jqplot/1.0.0b2/jquery.jqplot.min.js"></script>
<script src="//leggetter.github.com/script-cdn/jqplot/1.0.0b2/plugins/jqplot.canvasTextRenderer.min.js"></script>
<script src="//leggetter.github.com/script-cdn/jqplot/1.0.0b2/plugins/jqplot.canvasAxisTickRenderer.min.js"></script>
<script src="//leggetter.github.com/script-cdn/jqplot/1.0.0b2/plugins/jqplot.canvasAxisLabelRenderer.min.js"></script>
<script src="//leggetter.github.com/script-cdn/jqplot/1.0.0b2/plugins/jqplot.barRenderer.min.js"></script>
<script src="//leggetter.github.com/script-cdn/jqplot/1.0.0b2/plugins/jqplot.categoryAxisRenderer.min.js"></script>
<link type="text/css" rel="stylesheet" href="//leggetter.github.com/script-cdn/jqplot/1.0.0b2/jquery.jqplot.min.css" />

<script>
$(function() {
  var updates = 500;
  var loop = 10;
  runTests(updates, loop);
});
function clearChart() {
  $('#timeSeriesChart').html('');
  $('#avgSeriesChart').html('');
}
function runTests(updates, loop) {
  clearChart();
  function doTest(updateMethod) {
    var start = new Date();
    for(var i = 0; i < updates; ++i) {
      updateMethod(i);
    }
    var end = new Date();
    var took = (end - start);
    return took;
  }
  function log(msg) {
    //$(document.body).append('<div>' + msg + '</div>');
  }
  log('***');
  log('Starting test loop');
  var results = {};
  var took;
  for(var testName in methods) {
    if(!results[testName]) {
      results[testName] = [];
    }
    for(var j = 0; j < loop; ++j) {
      took = doTest(methods[testName]);
      results[testName].push(took);
    }
  }
  var timeSeries = [];
  var timeSeriesLabels = [];
  var averageSeries = [];
  var testResults;
  for(var ranTestName in results) {
    testResults = results[ranTestName];
    log('Ran ' + ranTestName + ' ' + loop + ' times with ' + updates + ' updates');
    log('Took: ' + testResults.join('ms, ') + 'ms');
    log('');
    timeSeries.push(testResults);
    timeSeriesLabels.push(ranTestName);
    var total = 0;
    for(var i = 0, l = testResults.length; i < l; ++i) {
      total += testResults[i];
    }
    averageSeries.push((total/testResults.length));
  }
  var timeSeriesChart = $.jqplot ('timeSeriesChart', timeSeries, {legend: {show:true, labels:timeSeriesLabels}});
  var avgSeriesChart = $.jqplot('avgSeriesChart', [averageSeries], {
      seriesDefaults:{
          renderer:$.jqplot.BarRenderer,
          rendererOptions: {fillToZero: true}
      },
      series:timeSeriesLabels,
      axes: {
        xaxis: {
          tickRenderer: $.jqplot.CanvasAxisTickRenderer ,
          tickOptions: {
            fontFamily: 'Georgia',
            fontSize: '10pt',
            angle: -30
          },
          renderer: $.jqplot.CategoryAxisRenderer,
          ticks: timeSeriesLabels
        }
      }
  });
}
</script>
<script src="http://leggetter.github.com/script-cdn/blog_helpers/js/script-to-html.js"></script>
<script>
$(function() {
  $.scriptToHtml();
});
</script>

<style type="text/css">
.jqplot-table-legend { width: auto !important; }
.jqplot-table-legend td { text-align: left !important; }
</style></p>

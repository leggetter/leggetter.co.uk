---
layout: post
status: publish
published: true
title: Chrome/Safari (webkit) + real-time push = always loading indicator
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "With real-time push becoming mainstream more and more developers are going to start adding real-time push to their website. One minor user experience hurdle still to be fully solved for webkit based browsers is the \"always loading indicator\" which can appear if a streaming connection has been established to a push server or service. This indicator appears due to the streaming connection that has been established between JavaScript in the web browser, using an <a href=\"https://developer.mozilla.org/en/xmlhttprequest\">XMLHttpRequest object</a>, where you are effectively continually loading, or waiting, for content from the push server.\r\n"
wordpress_id: 822
wordpress_url: "http://blog.kwwika.com/chromesafari-webkit-real-time-push-always-loa"
date: "2010-06-04 10:42:00 +0100"
date_gmt: "2010-06-04 09:42:00 +0100"
categories:
  - Technology
tags:
  - real-time web
  - Chrome
  - Safari
  - Webkit
permalink: "http://blog.kwwika.com/chromesafari-webkit-real-time-push-always-loa"
---

<p>With real-time push becoming mainstream more and more developers are going to start adding real-time push to their website. One minor user experience hurdle still to be fully solved for webkit based browsers is the "always loading indicator" which can appear if a streaming connection has been established to a push server or service. This indicator appears due to the streaming connection that has been established between JavaScript in the web browser, using an <a href="https://developer.mozilla.org/en/xmlhttprequest">XMLHttpRequest object</a>, where you are effectively continually loading, or waiting, for content from the push server.<br />
<a id="more"></a><a id="more-822"></a><br />
<a href="http://posterous.com/getfile/files.posterous.com/kwwika/vXym0AE8k4GSV4JAp9uURQHFV4Bc3nClkXAjl2wLkCHyoGLkoFYJstYLEAK5/always_loading_chrome.png"><img src="http://posterous.com/getfile/files.posterous.com/kwwika/W9nJXCPgWod1EGqOivbOZjkR1fAind9PrjhujxYFLgjD06rw27y5Wk59EewZ/always_loading_chrome.png.scaled.500.jpg" alt="" width="500" height="373" /></a><br />
<a href="http://posterous.com/getfile/files.posterous.com/kwwika/P3BUZD3J3OH5XVmNTJGETKEax0EEpHamdXsYdD7dzPW0V2N7aFq442GHn4gf/always_loading_safari.png"><img src="http://posterous.com/getfile/files.posterous.com/kwwika/7GT2jM1keczbNr5zUqjDSJP1e0bJFzeFF0tB7CSowN7ubnka6EKo1ziDLsay/always_loading_safari.png.scaled.500.jpg" alt="" width="500" height="334" /></a></p>
<p><a href="http://blog.kwwika.com/chromesafari-webkit-real-time-push-always-loa">See and download the full gallery on posterous</a></p>
<p>It makes sense that webkit-based browsers do something to detect if a page has loaded and then stop displaying the loading indicator. However, it's still a bit unclear what determines if the loading indicator will be shown when a streaming connection is established from JavaScript. Following a <a href="http://www.google.co.uk/search?hl=en&amp;q=chrome+loading+indicator+comet&amp;aq=f&amp;aqi=&amp;aql=&amp;oq=&amp;gs_rfai=">bit of googling</a> and some tinkering it would appear that you can stop the loading indicator if you establish your streaming connection after all other page content has loaded. Oh, it's easy then? Nope! Determining when all page content has loaded doesn't appear to be as simple as you would think.</p>
<p>To save some time I tried establishing my streaming connection to Kwwika at different points in the page loading process using the jQuery library:</p>
<ol>
<li>DomContentReady via the <a href="http://api.jquery.com/ready/">.ready() jQuery function</a> (also see <a href="http://api.jquery.com/jQuery/#jQuery3">$(calback)</a>)</li>
<li>window.onload via the <a href="http://api.jquery.com/load-event/">.load() jQuery function</a></li>
</ol>
<p><span style="font-size: large;">Google Chrome</span><br />
When connecting within the .ready() callback the loading indicator would always appear.</p>
<p>[code lang="js"]<br />
$(document).ready(function()<br />
{<br />
    var oConn = kwwika.Service.connect();<br />
});<br />
[/code]</p>
<p>However, if you use the .load() callback 99% of the time the loading indicator would disappear after the page was loaded and then the real-time push connection would be established.</p>
<p>[code lang="js"]<br />
$(window).load(function()<br />
{<br />
    var oConn = kwwika.Service.connect();<br />
});<br />
[/code]</p>
<p><span style="font-size: large;">Safari</span><br />
In Safari the results when using the .ready() callback were exactly the same.</p>
<p>For the .load callback I had to introduce an additional wait using <a href="https://developer.mozilla.org/en/DOM/window.setTimeout">window.setTimeout</a> in order to lose the loading indicator.<br />
<span style="font-family: courier new, monospace;">$(window).load(setTimeout(function()</span><br />
<span style="font-family: courier new, monospace;">{</span><br />
<span style="font-family: courier new, monospace;"> var oConn = kwwika.Service.connect();</span><br />
<span style="font-family: courier new, monospace;">}, 10000));</span></p>
<p>If the .load() solution worked for both webkit-based browsers then I'd be happy to say that this problem has been resolved. However, having to add a random timeout to lose the loading indicator in Safari means that, for now, I think this is going to be a continuing annoyance for developers and will also impact the real-time push web application user experience by suggesting to users that the web application has not fully loaded.</p>
<p><a href="http://blog.kwwika.com/chromesafari-webkit-real-time-push-always-loa">Permalink</a></p>
<p>| <a href="http://blog.kwwika.com/chromesafari-webkit-real-time-push-always-loa#comment">Leave a comment  »</a></p>

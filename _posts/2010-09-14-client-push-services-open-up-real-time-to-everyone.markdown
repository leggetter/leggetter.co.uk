---
layout: post
status: publish
published: true
title: Client Push Services Open Up Real-Time to Everyone
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
excerpt: "<a href=\"http://www.flickr.com/photos/blakespot/4011035061/\"><img src=\"http://blog.programmableweb.com/wp-content/stopwatch.jpg\" alt=\"Real-time\" width=\"100\" height=\"75\" class=\"imgRight\" /></a>The number of services offering <a href=\"http://www.programmableweb.com/apitag/?q=realtime\">real-time APIs</a> is slowly but surely expanding and it looks like we're going to have to add quite a few more. Since the start of the year a new type of service has started to appear--client push services, which help developers include real-time updates in their web apps."
wordpress_id: 1782
wordpress_url: "http://blog.programmableweb.com/?p=15331"
date: "2010-09-14 05:00:58 +0100"
date_gmt: "2010-09-14 04:00:58 +0100"
categories:
  - Technology
tags:
  - JavaScript
  - real-time
  - cloud
  - websockets
  - realtime
  - APIs
  - SaaS
  - real-time client push
permalink: "http://www.programmableweb.com/category/all/news?p=15331"
---

<p><a href="http://www.flickr.com/photos/blakespot/4011035061/"><img src="http://blog.programmableweb.com/wp-content/stopwatch.jpg" alt="Real-time" title="Real-time" width="100" height="75" class="imgRight" /></a>The number of services offering <a href="http://www.programmableweb.com/apitag/?q=realtime">real-time APIs</a> is slowly but surely expanding and it looks like we&#8217;re going to have to add quite a few more. Since the start of the year a new type of service has started to appear&#8211;client push services, which help developers include real-time updates in their web apps.</p>
<p>Real-time client push APIs have actually been around for quite a while (around 10 years) as they are shipped with <a href="http://en.wikipedia.org/wiki/Comet_(programming)">Comet servers</a> but only recently have these been moved into the cloud and offered as a service. The service flavour of these APIs give the developer the ability to instantly push information from their web server, through their chosen push service and into a web browser viewing their website.</p>
<p><img src="http://blog.programmableweb.com/wp-content/scrabbly.jpg" alt="Scrabb.ly -- real-time multi-player word game" title="Scrabb.ly -- real-time multi-player word game" width="578" height="342" class="aligncenter size-full wp-image-15374" /></p>
<p>Real-time client push is intended to replace the previous pull, or polling, mechanism that has been used for many years to mimic live data on a website. Using push via a dedicated Comet server is generally more resource efficient than polling a web server, and by using a service the resource load and complexity involved in setting up and running a Comet service is completely taken away from the developer&#8217;s considerations. This means that the web server is under much less strain, the developer can concentrate on building a killer real-time application and the website user gets the benefit of a truly real-time experience.</p>
<p>These services have only recently started to pop up due to a number of technology advancements. To be able to use a real-time client push service the web browser needs to be able to maintain a persistent connection back to the web server so that the web server can push information to it as soon as it becomes available. This has been achievable for a number of years via what some developer have labelled as &#8220;hacks&#8221; but is now easier than it has ever been. Most of the new services use the JavaScript <a href="http://en.wikipedia.org/wiki/WebSockets">WebSocket</a> object to achieve this and fallback to using Flash if WebSockets are not supported by the browser.</p>
<p>The web browser also needs to be able to maintain a <em>cross domain</em> connection from the JavaScript code running in the website to the service e.g. a connection from blog.programmableweb.com to www.example.com. In older browsers cross domain connections were not allowed but the introduction of client access policy files (<a href="http://www.adobe.com/devnet/articles/crossdomain_policy_file_spec.html">crossdomain.xml</a> and <a href="http://msdn.microsoft.com/en-us/library/cc197955(VS.95).aspx">clientaccesspolicy.xml</a>) and more recently the <a href="http://www.w3.org/TR/2008/WD-access-control-20080912/#access-control-allow-origin">Access-Control-Allow-Origin</a> HTTP header have made cross domain calls from JavaScript possible (You can find more information and a demo of this in action <a href="/2010/03/12/making-cross-domain-javascript-requests-using-xmlhttprequest-or-xdomainrequest.html">here</a>).</p>
<p>All of the real-time client push services have adopted a data <a href="http://en.wikipedia.org/wiki/Publish/subscribe">publisher subscriber model</a> with the web server code generally acting as the data publisher and the JavaScript code running in the web browser acting as the data subscriber. Subscriptions are made to a channel (or topic), that either exists or will be created, within the service and are identified by a name e.g. &#8220;my_channel&#8221; or &#8220;/PW/CHAT&#8221;. The publishers then simply publish data to that channel or topic using a service API and the information is instantly received by all subscribers, again via an API.</p>
<p>The real-time client push services that we know of at the moment are:</p>
<ul>
<li><a href="http://beaconpush.com/">Beacon</a></li>
<li><a href="http://hookbox.org/">Hookbox</a></li>
<li><a href="http://kwwika.com/">Kwwika</a> (disclosure: author is a founder)</li>
<li><a href="http://www.pubnub.com/">PubNub</a></li>
<li><a href="http://pusherapp.com/">Pusher</a></li>
<li><a href="http://www.frozenmountain.com/websync/">WebSync</a></li>
</ul>
<p>And some examples of their use include:</p>
<ul>
<li><a href="http://blog.programmableweb.com/2010/08/26/real-time-news-reader-shows-off-push-to-browser/">A real-time news reader</a></li>
<li><a href="http://www.pubnub.com/blog/facebook-meh-button">A Facebook &#8220;meh&#8221; button</a></li>
<li><a href="http://www.startupmonkeys.com/2010/09/building-a-scrabble-mmo-in-48-hours/">Interactive games</a></li>
<li><a href="http://kwwika.com/Standalone/Demos/ReplayWorldCup2010/">Real-time sports statistics</a> (requires HTML5 support)</li>
</ul>
<p>You can also check out the demos on each of the services websites.</p>
<p><img src="http://blog.programmableweb.com/wp-content/meh-button.jpg" alt="The real-time &#039;meh&#039; button" title="The real-time &#039;meh&#039; button" width="457" height="136" class="aligncenter size-full wp-image-15373" /></p>
<p>Real-time is already a big topic and users are starting to demand data and results as fast as possible. There is also the expectation that they should be informed as soon as new data is available or the existing data changes. Google are already pressing ahead with new real-time advancements such as <a href="http://www.google.com/realtime">Google Real-Time search</a> (which actually <a href="/2010/08/27/google-realtime-search-isnt-real-time.html">uses polling</a>) and <a href="http://www.google.com/instant/">Google Instant</a> but the good news is that with the availability of real-time client push services any developer can now add real-time to their website.</p>
<p>Let us know if you are interested in finding out more about these real-time client push APIs and services and we&#8217;ll cover each one in more detail.</p>
<p>Photo via <a href="http://www.blakespot.com/">Blake Patterson</a></p>
<p><a href="http://blog.programmableweb.com/2010/09/14/client-push-services-open-up-real-time-to-everyone/">Originally posted on Programmable Web</a></p>

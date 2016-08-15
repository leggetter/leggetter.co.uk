---
layout: post
status: publish
published: true
title: Real-Time Web or Right-Time Web?
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
excerpt: "<img src=\"http://blog.programmableweb.com/wp-content/pull-push.jpg\" alt=\"\" width=\"75\" height=\"75\" class=\"imgRight\" />Real-time and the real-time web continue to be a hot topic of conversation but is the term \"real-time\" getting used correctly? When we talk about real-time technology are we truly describing what the technology is delivering or is it being used and abused as just another marketing buzz word? Can we class any of the current technology solutions as truly real-time and can other solutions be defined in any other way? Is it too late to save \"real-time\" or will it forever be lost to marketing?"
wordpress_id: 9294
wordpress_url: "http://blog.programmableweb.com/?p=18560"
date: "2011-03-17 08:00:21 +0000"
date_gmt: "2011-03-17 08:00:21 +0000"
categories:
  - Twitter
tags:
  - comet
  - Google
  - real-time
  - pubsubhubbub
  - http polling
  - http streaming
  - websockets
  - realtime
  - real-time client push
  - real-time browser push
  - chartbeat
  - HTTP Push
permalink: "http://www.programmableweb.com/category/all/news?p=18560"
---

<p><a href="http://www.flickr.com/photos/booleansplit/2201440179/"><img class="imgRight" title="Pull? Push?" src="http://blog.programmableweb.com/wp-content/pull-push.jpg" alt="" width="75" height="75" /></a>Real-time and the real-time web continue to be a hot topic of conversation but is the term “real-time” getting used correctly? When we talk about real-time technology are we truly describing what the technology is delivering or is it being used and abused as just another marketing buzz word? Can we class any of the current technology solutions as truly real-time and can other solutions be defined in any other way? Is it too late to save “real-time” or will it forever be lost to marketing?</p>
<p>Back in July 2009 even Wikipedia <a href="http://blog.caplin.com/2009/04/20/what-is-the-real-time-web/">didn’t have a definition for “Real-Time Web”</a> although it was being used by a lot of companies to describe their products and services. Wikipedia does have a definition now and the fundamental top-level definition is:</p>
<blockquote><p>The real-time web is a set of technologies and practices that enable users to receive information as soon as it is published by its authors, rather than requiring that they or their software check a source periodically for updates.</p></blockquote>
<p>The key point here is that the information should be received by the users as soon as it is published <strong>without</strong> the need to periodically check the source for updates. To make this even simpler let’s define this as “Push, not Pull”.</p>
<p>We’ve previously discussed real-time technologies and services in our <a href="http://blog.programmableweb.com/2011/01/06/real-time-data-delivery-http-streaming-versus-pubsubhubbub/">HTTP Streaming v PubSubHubbub</a> article but haven’t defined this fundamental point of Push, not Pull. Push should be core to any real-time technology as demonstrated by HTTP Streaming, WebSockets, PubSubHubbub, Webhooks and Comet and as used by <a href="http://blog.programmableweb.com/2010/09/14/client-push-services-open-up-real-time-to-everyone/">real-time client push services</a> and services such as <a href="http://blog.programmableweb.com/2010/12/20/superfeedr-introduces-real-time-client-push-capabilities/">Superfeedr</a> and <a href="http://blog.programmableweb.com/2011/01/17/browse-build-and-share-real-time-streams-with-datasift/">DataSift</a>. Any event or notification based system needs to use Push in order to instantly deliver information to all interested parties (a User viewing a UI or a 3rd party system). The current version of Real-Time Web on Wikipedia lists <a href="http://en.wikipedia.org/w/index.php?title=Real-time_web&amp;oldid=417242073#True-realtime_web_.28an_.22alternate.22_model.29">a “True real-time web” alternative</a> description which attempts to better define the experience and technologies required to deliver a true real-time web experience but it is in need of some refinement.</p>
<p>What this means is that products, services and systems that currently use a Pull mechanism to deliver data, specifically in the form of polling, within their real-time service or application aren’t truly real-time. This doesn’t mean that the service or application isn’t valuable, it just means they are using technology that does not fall under the definition of a real-time web technology. A few examples of services and applications that use claim to be real-time web solutions but don’t use real-time web technology in their delivery of information to the web browser include (and you may be surprised by a couple):</p>
<ul>
<li><a href="http://search.twitter.com">search.twitter.com</a> – 30 second polling intervals</li>
<li><a href="http://www.google.com/webhp#q=real-time&amp;tbs=mbl:1&amp;oi=mode_link">Google real-time search</a> – 30 second polling intervals</li>
<li><a href="http://chartbeat.com/">Chartbeat</a> – polling seems to vary in their <a href="http://chartbeat.com/demo/">dashboard demo</a> between 10 and 15 seconds</li>
<li><a href="http://aboutecho.com/">Echo</a> – a <a href="http://echosandbox.com/use-cases/commenting/">demo</a> shows a polling interval of 10 seconds</li>
</ul>
<p>So, what should they call their service is they can’t use “real-time”? If instant notification of new data isn’t necessary, and a service or application has chosen to use a pull (polling) solution which delivers the data in a timely manner so that it is still useful then I would classify this as a “right-time web” solution. Right-time Web technology should not be confused with the <a href="http://dpakman.wordpress.com/2010/04/16/the-right-time-web/">right-time web idea</a> which is about ensuring you get relevant information. Right-time web technology ensure you get the information you are interested in whilst it is still relevant and in a lot of cases polling solutions can achieve this.</p>
<p>Real-time web technologies should be used when the instant delivery of data is required – when seconds or even milliseconds really matter. That’s why these technologies have been pioneered in the financial sector and have been <a href="http://blog.programmableweb.com/2011/02/25/the-evolution-and-future-of-real-time-browser-push/">in that sector for over 10 years</a> and have only recently moved into wider adoption. There is also an argument that push technology can actually be more efficient than polling since updates are pushed only when new data is available where as polling solutions always make a request at a given interval even if no new data is available leading to wasted client/server round trips.</p>
<p>Right-time web technologies can be used when the instant delivery of data isn’t important and when delivering data within a set interval, normally 10, 20 or 30 seconds doesn’t impact the value of that data.</p>
<p>It’s probably too late for the terms “real-time” and the “real-time web” and as they have already been hijacked and will continue to be used even when the underlying technology, and the experience that is being delivered, isn’t truly real-time and would be better being referred to as right-time web solutions. Real-time and the real-time web are instead going to continue to be used as umbrella terms for technologies, services and applications that want to present themeselves as cutting edge so it would appear that real-time web and right-time web technologies are going to continue to be incorrectly synonymous.</p>
<p>Photo by <a href="http://www.robertsdonovan.com/">Robert S. Donovan</a></p>
<p>Originally written by me for <a href="http://blog.programmableweb.com/2011/03/17/real-time-web-or-right-time-web/">Programmable Web</a>.</p>

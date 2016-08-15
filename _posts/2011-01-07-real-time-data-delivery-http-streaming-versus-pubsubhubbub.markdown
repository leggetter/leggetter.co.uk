---
layout: post
status: publish
published: true
title: "Real-time Data Delivery: HTTP Streaming Versus PubSubHubbub"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
excerpt: "<a href=\"http://www.flickr.com/photos/blakespot/4011035061/\"><img class=\"imgRight\" src=\"http://blog.programmableweb.com/wp-content/stopwatch.jpg\" alt=\"Real-time\" width=\"100\" height=\"75\" /></a>There are a number of ways of delivering data in real-time but until recently it has looked like <a href=\"http://code.google.com/apis/pubsubhubbub/\">PubSubHubbub</a>, with the backing of Google, was going to be the preferred method. However, the past couple of weeks have seen a couple of interesting developments which could indicate that the developer community may actually prefer HTTP Streaming."
wordpress_id: 4581
wordpress_url: "http://blog.programmableweb.com/?p=17440"
date: "2011-01-07 01:30:32 +0000"
date_gmt: "2011-01-07 01:30:32 +0000"
categories:
  - Technology
tags:
  - comet
  - rssCloud
  - pubsubhubbub
  - http streaming
  - websockets
  - Kwwika
  - Superfeedr
  - RSS
  - realtime
  - XMPP
  - DataSift
  - beacon
  - google buzz
  - google wave
  - livecycle
  - mqtt
  - notify.me
  - pubnub
  - pusher
  - webhooks
permalink: "http://www.programmableweb.com/category/all/news?p=17440"
---

<p><a href="http://www.flickr.com/photos/blakespot/4011035061/"><img class="imgRight" title="Real-time" src="http://blog.programmableweb.com/wp-content/stopwatch.jpg" alt="Real-time" width="100" height="75" /></a>There are a number of ways of delivering data in real-time but until recently it has looked like <a href="http://code.google.com/apis/pubsubhubbub/">PubSubHubbub</a>, with the backing of Google, was going to be the preferred method. However, the past couple of weeks have seen a couple of interesting developments which could indicate that the developer community may actually prefer HTTP Streaming.</p>
<p>The emergence of the real-time web has seen an increase in the visibility of technologies that facilitate the delivery of data in real-time. Twitter was most probably the catalyst for this due to the many high profile cases where Twitter has been able to deliver the news before any other traditional news medium; the Hudson river plane crash is probably the best example of this. Some of the real-time technologies include PubSubHubbub, <a href="http://rsscloud.org/">RSSCloud</a>, <a href="http://en.wikipedia.org/wiki/Comet_(programming)">Comet</a>, <a href="http://xmpp.org/xmpp-software/">XMPP</a>, <a href="http://mqtt.org/">MQTT</a>, <a href="http://www.adobe.com/products/livecycle/dataservices/">Adobe LiveCycle</a>, <a href="http://www.waveprotocol.org/">Google Wave Protocol</a>, <a href="http://wiki.webhooks.org/w/page/13385124/FrontPage">WebHooks</a>, <a href="http://en.wikipedia.org/wiki/WebSockets">WebSockets</a> and HTTP Streaming to name but a few.</p>
<p>We’ve also seen an increase in the number of real-time services over the past year who have used these technologies. Services such as <a href="http://beaconpush.com/">Beacon</a>, <a href="http://datasift.net/">DataSift</a>, <a href="http://www.google.com/buzz">Google Buzz</a>, <a href="http://kwwika.com/">Kwwika</a> (disclosure: author is a founder), <a href="http://notify.me/">notify.me</a>, <a href="http://www.pubnub.com/">PubNub</a>, <a href="http://pusherapp.com/">Pusher</a>, <a href="http://superfeedr.com/">Superfeedr</a> and of course <a href="http://dev.twitter.com/">Twitter</a>. You can also find a number of other <a href="http://www.programmableweb.com/apitag/realtime">real-time APIs</a> in our directory.</p>
<p>HTTP Streaming has been generally associated with Ajax in the past. In fact the Wikipedia entry for HTTP Streaming (under the Push Technology page and listed as <a href="http://en.wikipedia.org/wiki/Push_technology#HTTP_server_push">HTTP server push</a>) talks only about “sending data from a web server to a web browser.” This is out of date and HTTP Streaming is now much more than this. HTTP Streaming takes advantage of the fact that the Internet infrastructure has been built with HTTP in mind (as does PubSubHubbub). HTTP is fully supported so as well as using this protocol to distribute your static content such as HTML, images, CSS and JavaScript why not use it to distribute real-time data as well. The part of the Wikipedia definition for HTTP Streaming that is correct is:</p>
<blockquote><p>Generally the web server does not terminate a connection after response data has been served to a client. The web server leaves the connection open such that if an event is received, it can immediately be sent to one or multiple clients.</p></blockquote>
<p>A client in this context doesn’t have to be a web browser. It can be another web server, a desktop app, a mobile phone app, an embedded program running on a piece of hardware, a web application; basically any web enabled device capable of making a persistent HTTP connection.</p>
<p>This might be why services such as <a href="http://superfeedr.com/">Superfeedr</a>, who consistently champions PubSubHubbub, have <a href="http://blog.programmableweb.com/2010/12/20/superfeedr-introduces-real-time-client-push-capabilities/">introduced support for HTTP Streaming</a> and why new services like <a href="http://datasift.net/">DataSift</a> has provided <a href="http://support.datasift.net/kb/streaming-api/http-streaming-api">support</a> from almost day one.</p>
<p>So, why are services starting to offer HTTP Streaming? The first thing you may think is that a persistent HTTP connection might be a faster way of receiving data than PubSubHubbub and it’s intermittent HTTP Push requests. Surprisingly this isn’t supposed to be the case since “HTTP 1.1 reuses TCP connections <a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec8.html">by default</a>” as I <a href="http://www.onebigfluke.com/2010/09/common-misconception-explained-by-phil.html">recently found out</a>.</p>
<p>One thing that PubSubHubbub does require is that the push notifications have to be made to a web server. This means that PubSubHubbub is highly unlikely to be used for real-time client data delivery because client applications don’t tend to run their own web server. Therefore HTTP Streaming is a more accessible real-time data delivery mechanism since any technology that can make a web request, and hold a persistent HTTP connection, can receive real-time push notifications. This means that by offering a HTTP Streaming API a service can be consumed by anything from a hardware embedded system to a mobile application as long as they are connected to the Internet.</p>
<p>The other thing that PubSubHubbub does is define the message format. This can be seen as a positive and a negative but since we are seeing <a href="http://blog.programmableweb.com/2010/12/03/json-continues-its-winning-streak-over-xml/">JSON continuing to win over XML</a> as the preferred data format it looks like PubSubHubbub will have to evolve away from XML to keep up as this <a href="http://www.quora.com/Why-doesnt-Facebook-implement-PubSubHubbub-as-a-Subscriber">question on Quora suggests</a>.</p>
<p>This is an exciting trend which will most probably continue and will lead to us seeing truly real-time applications on any web-enabled device. It certainly doesn’t signal the end of the road for PubSubHubbub, which has its roots firmly in RSS (and XML), along with so much of the Internet. However, HTTP Streaming could become defacto standard for client push applications.</p>
<p>Photo via <a href="http://www.blakespot.com/">Blake Patterson</a></p>
<p><a href="http://blog.programmableweb.com/2011/01/06/real-time-data-delivery-http-streaming-versus-pubsubhubbub/">Originally posted on Programmable Web</a></p>

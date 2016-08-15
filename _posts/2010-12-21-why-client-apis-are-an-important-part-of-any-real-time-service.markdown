---
layout: post
status: publish
published: true
title: Why client APIs are an important part of any real-time service
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
wordpress_id: 3863
wordpress_url: "https://www.leggetter.co.uk/?p=3863"
date: "2010-12-21 17:53:20 +0000"
date_gmt: "2010-12-21 17:53:20 +0000"
categories:
  - Technology
tags:
  - real-time web
  - real-time data
  - real-time
  - Kwwika
  - real-time push
  - Superfeedr
  - DataSift
  - Curation
  - Data Filtering
permalink: /2010/12/21/why-client-apis-are-an-important-part-of-any-real-time-service.html
---

<p>I've just been involved in a twitter conversation with <a href="http://twitter.com/#%21/nickhalstead">Nick Halstead</a> of <a href="http://datasift.net">DataSift</a> on Twitter. This all started when I <a href="http://twitter.com/#%21/leggetter/status/17233038429655041">tweeted</a> that I thought <a href="http://kwwika.com">Kwwika</a> would be a great way of distributing data from DataSift to any web-enabled device.</p>
<p>The conversation continued:</p>
<p><img style="max-width: 800px;" src="/wp-content/uploads/2010/12/leggetter-nickhalstead-conversation1.png" alt="" /></p>
<p>The main thing here for me is Nick's point that "<strong>you just need a client-side library</strong>". This is an assumption that a lot of services make. Services tend to offer one or a number of server APIs; maybe a REST one and now luckily we are seeing a HTTP Streaming and WebSocket support. That service may then release some example code that can be used to call the web service. I see a number of problems with this mainly when it comes to HTTP Streaming and WebSockets.</p>

<ul>
<li><a href="http://support.datasift.net/help/kb/rest-api/websocket-streaming">DataSift WebSocket Streaming Docs</a></li>
<li><a href="http://support.datasift.net/help/kb/rest-api/http-streaming-api">DataSift HTTP Streaming Docs</a></li>
</ul>
<p>WebSockets aren't as yet supported in enough browsers. Therefore it's not viable to purely rely on WebSocket support in any production application. So, you can't build a web application unless there is a fallback alternative. HTTP Streaming in a web browser could be a fallback (XmlHttpReqeust, XDomainRequest or Flash connections) if the server provides the necessary <a href="http://dev.w3.org/2006/waf/access-control/#access-control-allow-origin-response-hea">Access-Control-Allow-Origin</a> response header, the browser is new enough, or if the user has Flash installed the server serves up a crossdomain.xml file and the developer is willing to also write code to deal with all the browser types and technoloy scenarios. Then you need to deal with authentication from a web browser for some services to let you access their HTTP Streaming API. DataSift will class your connection as a 2nd class client if you don't authenticate:</p>
<blockquote><p>Authorization is not required on the streaming API. However, should you chose not to authenticate, you may be subject to stricter rate limiting and other disadvantages over an authorized user. Therefore, authorization is strongly recommended</p></blockquote>
<p>What this means is that DataSift as yet don't support real-time updates in web browser clients fully.</p>
<p>Then you need to consider other technologies like .NET, Java, C or C++ desktop applications, mobile applications on iPhone, iPad, Windows Mobile 7 or Palm using webOS. Each of these technologies requires a client API.</p>
<ul>
<li><a href="http://support.datasift.net/help/kb/libraries/api-client-libraries">DataSift API Client Libraries</a></li>
</ul>
<h3>A Scenario</h3>
<p>Say I were building a new service which focused on real-time data and delivery of that data in our custom application to desktop app, mobile apps and web apps. My service is focused on curating real-time data from different sources. My first port of call would be DataSift or Superfeedr (I'm going to leave Kwwika out of the equation here). I know these guys can deal with large volumes of data and can provide some filtering. Maybe if filtering was absolutely key I would go for DataSift (maybe <a href="http://twitter.com/#%21/julien51">Julien</a> would tell me off for that).</p>
<p>Now I've made my choice and I've got all the data I want streaming through my chosen service and I start to build my client applications. If I choose to build my web application first I'm stumped as I've already explained, but let's say I want to build a Windows desktop application first. Simple, I use the HttpWebRequest object to create a HTTP Streaming connection to DataSift, follow the connection guidelines that DataSift follow (<a href="http://dev.twitter.com/pages/streaming_api_concepts#connecting">Twitter's HTTP Streaming guidelines</a> including a backing off process and handle reconnection) and I've not got my real-time Windows desktop application.</p>
<p>I now decide to build an iPhone application so that people on the move can access my service. I need to start from scratch by writing iOS (Objective-C) code to connect to DataSift's HTTP streaming API, following the back off process and deal with reconnection. Once I've done that I move on to Windows 7 Mobile and I have to do the same again.</p>
<p><img style="max-width: 800px;" src="/wp-content/uploads/2010/12/DataSift-not-kwwika1.png" alt="" /></p>
<p>You get my point.</p>
<p>Now, once DataSift becomes popular, and it will, there will be loads of open source client APIs to choose from. However, these APIs are likely to have been built by a number of different developers providing different ways of doing the same things. Some might be DataSift specific but hopefully they'll be generic HTTP Streaming libraries. At this point building my service applications will become a little easier but, in my opinion, still not as easy as it should be.</p>
<h3>Using Kwwika</h3>
<p>If I were to build this service, and not exclude Kwwika, I would set up all my real-time data streaming through DataSift and write a single library, probably reusing the <a href="http://wiki.kwwika.com/components/kwwika-tweet-streamer">Kwwika Tweet Streamer</a> code which handles the HTTP Streaming connection and the Twitter connection guidelines, and push the data from DataSift into Kwwika. For each of my client applications I could simply download/use the relevant <a href="http://wiki.kwwika.com/api">Kwwika API</a> (JavaScript, .NET, Silverlight, Flash, Objective-C, Java, C) to subscribe to the DataSift data on any web-enabled device. And because these APIs are are developed and maintained by Kwwika they are consistent across platforms e.g. if you've used the .NET API you will be familiar with the JavaScript API.</p>
<p><img style="max-width: 800px;" src="/wp-content/uploads/2010/12/DataSift-just-kwwika.png" alt="" /></p>
<p>My point is that the client APIs are as important as the server APIs. A quality real-time client API adds a lot of value to the service such as handling reconnection, failover, subscription management, connection monitoring, error handling, bi-directional messaing and request batching (not relevant in this scenario). As well as real-time data distrubtion/messaging/client push this is a key part of what Kwwika offers.</p>

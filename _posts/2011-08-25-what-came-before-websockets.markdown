---
layout: post
status: publish
published: true
title: What came before WebSockets?
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
excerpt: With the arrival of WebSockets we finally have a standardised technology for true realtime bi-directional communication between a server and a web browser (or any other client). When we were creating our What are WebSockets?  page we decided to write u...
wordpress_id: 21760
wordpress_url: "http://blog.pusherapp.com/2011/8/10/what-came-before-websockets"
date: "2011-08-25 01:00:00 +0100"
date_gmt: "2011-08-25 00:00:00 +0100"
categories:
  - Technology
tags:
  - websockets
  - pusher
  - api-fanboy
permalink: "http://blog.pusherapp.com/2011/8/10/what-came-before-websockets"
---

<p>With the arrival of <a href="http://pusher.com/websockets">WebSockets</a> we finally have a standardised technology for true realtime bi-directional communication between a server and a web browser (or any other client). When we were creating our <a href="http://pusher.com/websockets">What are WebSockets?</a>  page we decided to write up a history of the technologies that came before and that are in some cases still in use today. How did we (developers) achieve <strong>realtime browser push</strong> before WebSockets and what were the downfalls of those technologies which meant they never really became mainstream? Here's that write-up.</p>
<p>The Internet wasn't originally built to be all that dynamic. It was conceived to be a collection of HyperText Markup Language (HTML) pages linking to one another to form a conceptual web of information. Over time the static resources increased in number and richer items, such as images, began to be part of the web fabric. Server technologies advanced allowing for dynamic server pages - pages whose content was generated based a query.</p>
<h3>DHTML</h3>
<p>Soon there was a requirement for the Internet client, the web browser, to be more dynamic, for it to offer a richer experience. This was achieved through browser scripting in the form of VBScript and JavaScript and was known as Dynamic Hyper Text Markup Language (DHTML). Whilst this improved the web browser experience to some degree it still fell short in allowing a true application experience to be built within the web browser - the web pages still needed to refresh and reload relatively frequently.</p>
<h3>Cross Frame Communication</h3>
<p>As web browsers evolved so did the scripting technologies and the techniques employed when using them. Application-style functionality was achieved within websites though tricks such as cross frame communication.  These techniques allowed new data to be loaded from the server without the page refreshing by a frame loading a new page from the server and in doing so retrieving new information.</p>
<p>Up until this point all actions within a website, web page or web application had consistent of a user action generating a request to a server from the web browser. But what if the web server had some new, additional information for the user?</p>
<h3>HTTP Polling</h3>
<p>The first solution to this problem was for the client to poll the server at regular intervals. This solution was, and still is, inefficient and leads to stale data being displayed in web pages and applications.</p>
<h3>LiveConnect</h3>
<p>The next step in the evolution of the web and web applications was for developers to find a way for the server to push new information to the to the web browser from the server. This was first achieved through the use of Java applets which could create a long-held connection with the server and communicate with JavaScript in the web page through a feature known as <strong><a href="http://en.wikipedia.org/wiki/LiveConnect">LiveConnect</a></strong>.</p>
<h3>Forever Frame</h3>
<p>The LiveConnect technique was relatively quickly superseded, due to Java Virtual machine inconsistencies, by a native browser technique known as <strong><a href="http://cometdaily.com/2007/11/05/the-forever-frame-technique/">forever frame</a></strong> where a long-lived HTTP connection is established to the server using a hidden frame. Data, usually &lt;script&gt; blocks, can then be pushed from the server to the client over this connection and incrementally executed by the web browser.</p>
<h3>AJAX</h3>
<p>Then, thanks to Microsoft's requirements with their Outlook web application, the <code>XMLHttpRequest</code> object was born introducing at technology that made something we all now know as Asynchronous JavaScript and XML (<a href="http://en.wikipedia.org/wiki/Ajax_(programming)">AJAX</a>) possible. The ability to make a request to the server from JavaScript without the need for any cross frame communication, often referred to as a hack, had been long awaited. Other browser vendors slowly but surely introduced support for the <code>XMLHttpRequest</code> and without it being an official standard it became one.</p>
<h3>HTTP Long-Polling and XHR Streaming</h3>
<p>Additional techniques arrived including <strong>script tag long-polling</strong>, <strong>htmlfile ActiveX Object</strong>, <strong>XHR long-polling</strong>, <strong>XHR multipart-replace</strong> and <strong>XHR Streaming</strong>.</p>
<p>The <strong>long-polling</strong> techniques work by establishing a connection to the server which is held open. When the server has more data for the client it sends that data through and closes the connection. The client then re-establishes the connection and waits for any new data. The main problem with this technique is that during the reconnection process the data on the page could be out of date and inaccurate.</p>
<p><strong>XHR multipart-replace</strong> and <strong>XHR Streaming</strong> are much better HTTP solutions since they maintain a connection between the client and the server. Even so the long-polling solutions were more popular due cross browser inconsistencies with XHR multipart-replace and XHR Streaming. XHR multipart-replace, which was potentially the best solution of all, only works in Gecko-based browsers. XHR Streaming worked in all browsers the <code>responseText</code> of the <code>XMLHttpRequest</code> object would continue to grow until the connection was closed meaning a reconnection had to eventually be forced to clear this buffer.</p>
<h3>Bi-directional Communication (and the two connection limit)</h3>
<p>One of the problems with all of the realtime browser solutions so far was that they all required two HTTP connections. The first HTTP connection is used as the back/data/streaming channel where data is sent from the server to the client. A second connection is required to send commands for things such as logging in, changing subscriptions and publishing events/messages. To begin with this caused quite a few problems due to a two 'same domain' connection limit enforced by web browsers which could lead to slow loading pages or the connection in a second browser window failing to establish at all. All modern browsers now have a high same domain connection limit which means this is much less of a problem.</p>
<h3>Cross domain support</h3>
<p>For a long time we've been able to embed a <code>script</code> tag on our site from CDNs to save us bandwidth and benefit from browser caching. One big restriction with scripting however is that script running on a web page can only communicate with other scripts executing in the same domain. For example, if a page served from pusher.com contained an <code>iframe</code> serving news.bbc.co.uk then script in these web pages would not be able to communicate with one another, and rightly so. This restriction was also enforced for the <code>XMLHttpRequest</code> object; If script was running in a page on pusher.com the <code>XMLHttpRequest</code> could only be made to a resource on pusher.com. In an age where web services are everywhere and usage of such services are encouraged for things such as mashups then this became quite a big restriction. This additionally meant that anybody trying to develop an application using a realtime push technology had to host their realtime server on the same domain as their website. This meant they <strong>had to</strong> self host. Again, in a time where <strong>cloud hosting</strong>, <strong>cloud services</strong>, <strong>Software as a Service (SaaS)</strong>, <strong>Platform as a Service (PaaS)</strong> and <strong>Infrastructure as a Service (IaaS)</strong> are so popular this was a massive restriction.</p>
<p>The need for this <strong><a href="http://www.w3.org/TR/cors/">Cross Origin Resource Sharing (CORS)</a></strong> lead to the introduction of the <strong><a href="http://www.w3.org/TR/cors/#access-control-allow-origin-response-hea">Access-Control-Allow-Origin header</a></strong> which allowed the server to indicate to the browser making the <code>XMLHttpRequest</code> whether that request was actually allowed.</p>
<p>Even with CORS things weren't as simple as they should be. The forever frame v XHR long-polling v XHR streaming v XHR multipart-replace decision still needed to be made along with the new additional quirk of Internet Explorer adding its very own object, <code>XDomainRequest</code>, which had to be used for cross domain web requests.</p>
<p>These inconsistencies between web browsers and the multitude of 'realtime browser solutions' meant that barrier to using realtime push functionality, not to mention bi-directional communication, was still too high.</p>
<p><strong>But now we have <a href="http://pusher.com/websockets">WebSockets</a></strong>!</p>

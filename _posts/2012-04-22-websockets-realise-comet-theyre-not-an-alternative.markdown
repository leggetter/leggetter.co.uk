---
layout: post
status: publish
published: true
title: "WebSockets realise Comet. They're not an alternative."
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
wordpress_id: 23220
wordpress_url: "https://www.leggetter.co.uk/?p=23220"
date: "2012-04-22 19:58:14 +0100"
date_gmt: "2012-04-22 18:58:14 +0100"
categories:
  - Technology
tags:
  - comet
  - websockets
  - realtime web
  - api-fanboy
  - Realime Push
  - Realtime browser push
permalink: /2012/04/22/websockets-realise-comet-theyre-not-an-alternative.html
excerpt: Comet is an umbrella term for all the old HTTP-based hacks and is a phrase we want to get rid of. WebSockets are where we want to be; browsers and beyond. I’ve been thinking about writing about this frequently used statement for a while, and I’ve seen a few comments and discussions previously about this.
---

<p><strong>Update</strong></p>
<p>My opinion, indicated in the comments below, is now:</p>
<blockquote>
<p>Comet is an umbrella term for all the old HTTP-based hacks and is a phrase we want to get rid of. WebSockets are where we want to be; browsers and beyond.</p>
</blockquote>
<p>Below is the old post covering my original opinion:</p>
<hr />
<blockquote>
<p>"WebSockets or Comet"</p>
</blockquote>
<p>I’ve been thinking about writing about this frequently used statement for a while, and I’ve seen a few comments and discussions previously about this e.g. from <a href="http://twitter.com/martintyler">Martin Tyler</a> of <a href="http://www.caplin.com">Caplin Systems</a> and Peter Lubbers of <a href="http://kaazing.com">Kaazing</a> in a <a href="http://www.infoq.com/articles/Web-Sockets-Proxy-Servers#view_54559">post on InfoQ</a>).</p>
<p>Martin's point of view is:</p>
<blockquote>
<p>One thing I don't understand is your stance on Comet. You seem to want to distance Kaazing from Comet, despite the fact that your WebSocket emulation is surely Comet. More than this though, WebSocket itself is also Comet since Comet is just a paradigm, not a any specific transport mechanism.</p>
</blockquote>
<p>Peter's opinion is:</p>
<blockquote>
<p>Comet is a programming model that allows a web server to push data to a browser. This is often achieved through a long-held HTTP request, but there really is no standard or specification for Comet; it is just an umbrella term for all the different ways that can be used to achieve this.</p>
<p>WebSocket, on the other hand, is a well-defined API and protocol that allows for full-duplex, bidirectional communication (not just server push).</p>
</blockquote>
<p>Can you really say WebSockets is an alternative to Comet when Comet servers use WebSockets?</p>
<p>My current thinking is the same as Martin's (I did used to work with Martin). It is that:</p>
<p><strong>Comet is a paradigm, not only for server push but also for bi-directional communication.</strong></p>
<p>The need to do this with a web browser resulted in WebSockets – something which natively supported this in a way that HTTP did not. So, we have Comet to thank for WebSockets.</p>
<p>The <a href="http://en.wikipedia.org/wiki/Comet_&#40;programming&#41;">Wikipedia Comet entry</a> states:</p>
<blockquote>
<p>Comet is a web application model in which a long-held HTTP request allows a web server to push data to a browser, without the browser explicitly requesting it. Comet is an umbrella term, encompassing multiple techniques for achieving this interaction.</p>
</blockquote>
<p>Alex Russell’s <a href="http://infrequently.org/2006/03/comet-low-latency-data-for-the-browser/">original Comet blog post</a> states:</p>
<blockquote>
<p>Fundamentally, they all use long-lived HTTP connections to reduce the latency with which messages are passed to the server.</p>
<p>The architecture relies on a view of data which is event driven on both sides of the HTTP connection.</p>
</blockquote>
<p>All very HTTP related. <strong>But</strong> the second quote interestingly says <strong>“event driven on both sides”</strong>. This bi-directional communication, backed up by the diagram from the web post (see below), seems to have been lost in the wikipedia entry.</p>
<p>
<figure>
  <img alt="Original Comet diagram by Alex Russell" src="/images/Comet.png" /></p>
<figcaption>Original Comet diagram by Alex Russell. <small><a href="http://infrequently.org/2006/03/comet-low-latency-data-for-the-browser/">source</a></small></figcaption>
</figure>
<p>What I’m suggesting is that Comet is a paradigm for realtime bi-directional communication between a server and a client. Initially it used long-lived HTTP connections in addition to a second short-lived connection for command requests (e.g. subscribe) <strong>because it was the only solution</strong>. Comet servers now use WebSockets because they are now available, are better than the HTTP-based alternatives and help Comet (the paradigm) be achieved and finally truly realised in a standardised way.</p>
<p>I’m suggesting that HTTP Long-Polling or HTTP-Streaming (all using XMLHttpRequest, Script tag polling, IFRAMES, ActiveX objects) and WebSockets are transfer technologies (Martin used the term "transfer mechanism") that make the Comet paradigm possible.</p>
<p>I’m suggesting that saying “Comet or WebSockets” is an invalid statement and that the Wikipedia article is incorrect and that this diagram better reflects the relationship between WebSockets and Comet:</p>
<p>
<figure>
    <img alt="realtime web technology stack hierarchy" src="http://www.gliffy.com/pubdoc/2894748/L.png" /></p>
<figcaption>Realtime web technology stack hierarchy</figcaption>
</figure>
<p>I’m prepared to be wrong by being convinced otherwise. But I don't think I am or will. Interested in hearing your opinions.</p>
<p><em>Note: I originally posted the core text to this as a <a href="http://jfarcand.wordpress.com/2012/04/19/websockets-or-comet-or-both-whats-supported-in-the-java-ee-land/#comment-2271">comment</a> on a blog post <a href="http://jfarcand.wordpress.com/2012/04/19/websockets-or-comet-or-both-whats-supported-in-the-java-ee-land/">"Websockets or Comet or Both? What’s supported in the Java EE land"</a></em></p>

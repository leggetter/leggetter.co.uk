---
layout: post
status: publish
published: true
title: "Edinburgh Techmeetup, Web Browsers & the Realtime Web"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 22601
wordpress_url: "http://www.leggetter.co.uk/?p=22601"
date: "2012-02-09 10:48:33 +0000"
date_gmt: "2012-02-09 10:48:33 +0000"
categories:
  - Technology
tags:
  - websockets
  - pusher
  - web browsers
  - realtime web
  - SPDY
  - api-fanboy
permalink: /2012/02/09/edinburgh-techmeetup-web-browsers-the-realtime-web.html
---

<p>I gave a presentation yesterday at Edinburgh <a href="http://techmeetup.co.uk/">techmeetup</a>. A big thanks to <a href="https://twitter.com/daleharvey">Dale Harvey</a> for inviting me to talk and to all the attendees for taking the time to attend, listen and interact. <a href="http://twitter.com/aaronbassett">Aaron Bassett</a> also gave a good talk on Avoiding Integration Hell so I'd recommend you follow him for more info.</p>

<p>Here's a direct link to the <a href="/pres/techmeetup_edi_2012-02-08/">"Web Browsers &amp; the Realtime Web<br />
the past, present &amp; future" slides</a>.</p>
<p>And here's the recording of my talk (thanks to <a href="http://twitter.com/MariusCiocanel">Marius Ciocanel</a>):</p>
<p><iframe src="http://player.vimeo.com/video/36602961?title=0&amp;byline=0&amp;portrait=0" width="100%" height="400" frameborder="0" webkitAllowFullScreen mozallowfullscreen allowFullScreen></iframe></p>
<p><a href="http://vimeo.com/36602961">TechMeetup Talks - Phil @Leggetter on the past present and future of the Realtime web</a> from <a href="http://vimeo.com/techmeetup">TechMeetup</a> on <a href="http://vimeo.com">Vimeo</a>.</p>
<p>After the presentation there were a number of good questions asked here they are, and my answers. If you've any other questions please <a href="mailto:phil@leggetter.co.uk?subject=Web Browsers & the Realtime Web Qs">drop me an email</a> or leave a comment.</p>
<h3>Does WebSockets provide support for common use cases? Does it natively support Pub/Sub?</h3>
<p>As with most standardised technology WebSockets offer the very basics of what is required to enable realtime bi-directional communication between a server and a client;</p>
<ul>
<li><code>var ws = new WebSocket(url)</code> - connect</li>
<li><code>ws.onopen = function() {};</code> - connected</li>
<li><code>ws.onmessage = function(ev) {};</code> - some data has arrived</li>
<li><code>ws.send({"some":"data"});</code> - send some data to the server</li>
<li><code>ws.onclose = function() {};</code> - the connection has closed</li>
<li><code>ws.close();</code> - close the connection</li>
</ul>
<p>If you want functionality like auto reconnection, connection stability checking (<a href="http://www.whatwg.org/specs/web-apps/current-work/multipage/network.html#ping-and-pong-frames">ping/pong is hopefully coming</a>), the ability to subscribe to channels/topics/subjects in order to filter and partition data then you need to build this functionality yourself or user a client/server combination that already offers this. We've built this functionality into our Pusher JavaScript library and service.</p>
<h3>How do people on shared hosting use this technology?</h3>
<p>If you are on a shared hosting then the hosting provide doesn't tend to like this sort of technology because it requires you to maintain persistent connections between the hosting server and the client. I don't know for sure but I think PHP hosting services may do something to stop this sort of thing from working. However, I'm pretty sure that hosting services like <a href="http://www.joyent.com/">Joyent</a> will provide support since <a href="http://socket.io">socket.io</a> is quite possibly one of the most popular packages available. I could be wrong, but I'd be surprised if I am. If you know, please get in touch.</p>
<p>A great option here is to use <a href="http://pusher.com">Pusher</a> since it remove the need to maintain the persistent connections - it's technology agnostic.</p>
<h3>Do WebSockets have problems with proxies and firewalls?</h3>
<p>Yes, but connecting over a secure connection (WSS:// over port 443) will work in the majority of cases. For those cases it doesn't work I've seen HTTP Long-Polling and HTTP Streaming also having problems where proxies and firewalls don't like the long-held requests. It's really a battle between realtime technologies and older Internet infrastructure.</p>
<h3>Where does SPDY fit into the Realtime Web?</h3>
<p>"<a href="http://www.chromium.org/spdy/spdy-whitepaper">SPDY is an experimental protocol for a faster web</a>". It's actually used by Google Chrome and a number of Google web apps already (a quick Google suggestions <a href="http://www.datamation.com/open-source/firefox-11-gets-spdy.html">Firefox 11 will support SPDY</a>). The main problem is that in order for this protocol to be used we need the Internet Infrastructure to upgrade. This isn't going to happen to quickly. So, SPDY sounds very promising but it'll be a while until we see it widely adopted/used.</p>
<p>It's easier to move client technology forward (we need IE to auto update), but server technology looks like it'll be slower to move forward.</p>
<p>I recommend keeping an eye on <a href="http://www.igvita.com/2011/04/07/life-beyond-http-11-googles-spdy/">Ilya Grigorik's blog</a> for related tech info.</p>
<p>Please let me know if I've missed any questions (I'm sure I have) or if you have any further questions by [dropping me an email](mailto:phil@leggetter.co.uk?subject=Web Browsers &amp; the Realtime Web Qs) or leaving a comment</p>

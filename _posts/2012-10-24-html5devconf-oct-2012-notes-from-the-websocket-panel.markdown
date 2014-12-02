---
layout: post
status: publish
published: true
title: "HTML5DevConf - Oct 2012: Notes from the WebSocket panel"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 23505
wordpress_url: "http://www.leggetter.co.uk/?p=23505"
date: "2012-10-24 10:14:29 +0100"
date_gmt: "2012-10-24 09:14:29 +0100"
categories:
  - Technology
tags:
  - websockets
  - html5
  - San Francisco
  - HTML5DevConf
  - websocket
permalink: /2012/10/24/html5devconf-oct-2012-notes-from-the-websocket-panel.html
---

<p>On October 16th 2012 I sat on a <a href="http://html5devconf">HTML5DevConf</a> WebSocket panel along with <a href="http://www.igvita.com/">Ilya Grigorik</a> from Google, <a href="https://twitter.com/debergalis">Matt DeBergalis</a> from Meteor and <a href="http://www.twitter.com/pmoskovi">Peter Moskovits</a> from Kaazing - the panel was chaired by <a href="https://twitter.com/frankgreco">Frank Greco</a>, also of Kaazing.</p>

<p>Here are the notes, in a pretty raw format, from the event. A more curated write-up can be found on the <a href="http://blog.pusher.com/2012/10/22/a-realtime-focus-at-html5devconf">Pusher blog</a>.</p>

<h2>Where does WS affect current web infrastructure the most?</h2>
<ul>
<li>The potential for many more persistent connection to be held open.</li>
<li>As apps move away from polling this is a good things as it probably works out as less resource usage.</li>
<li>But as we see WebSockets used more and more we'll see more peristent connections. I'm not sure what the overall result would be of this.</li>
<li>Some parts of the Web infrastructure are playing catch-up:
<ul>
<li>Some proxies are troublesome. Whilst the majority of WebSocket connections get through over WSS/SSL on port 443 there are some cases where they don't.</li>
<li>Not really web infrastructure as such, but some anti-virus packages that offer "web shields" are blocking WebSockets. We're waiting on companies like Avast! to catch up. It's impacting user experiences and productivity.</li>
</ul>
</li>
</ul>
<h2>Why use WS when HTTP2.0/SPDY is soon pervasive?</h2>
<p>HTML5 represents a move to empower developers with the tools required to build rich interactive applications in the web browser. HTML5 WebSockets are a core element in enabling that interactive functionality. For me, WebSockets are a tool for developers - they're an API. SPDY is a protocol for the web browser to improve the efficiency of web content distribution.</p>
<h2>What's the real advantage of WS to web servers (and app servers)?</h2>
<ul>
<li>Bi-direction communication is they key benefit; instant interaction between client and server.</li>
<li>For apps that have been 'faking' realtime bi-directional functionality using Comet they can now do this in a standardised, and more efficient, way.</li>
</ul>
<h2>What new types of applications does WS unlock?</h2>
<p>It makes applications that we've previously been hacking more easily achievable:</p>
<ul>
<li>Instant notifications of activity about things we are interested in. IT'S NOT JUST ABOUT PUSH NOTIFICATIONS. These notifications can then be used to kick-off more interactive experiences. That's where WebSockets really stand out.</li>
<li>Live content
<ul>
<li>Stats</li>
<li>Live blogging</li>
<li>Realtime news</li>
<li>Realtime social feeds/activity streams</li>
<li>But these can be achieved using EventSource/SSE</li>
</ul>
</li>
<li>Interactive experiences
<ul>
<li>Realtime communication with colleagues and customers</li>
<li>Collaborative applications like Google docs - you don't need Google's infrastructure to build this sort of things now. It doesn't have to be text - there's a real opportunity to hook into some of the amazing features in HTML5 and build dynamic collaborative experiences.</li>
</ul>
</li>
<li>Because WebSockets is a standard it's not restricted to web browsers - I'm starting to see a lot more cross device interaction; one to one and one to many.
<ul>
<li>We're seeing quite a few Arduino applications built which is a great sign that we are moving towards the Internet of Things</li>
</ul>
</li>
<li>If you merge all this together - live content from different sources, interactive functionality between users, systems and devices, there's really very little limit to what can be achieved other than our imagination. This is why I think Creative Technologists are having a lot of fun with this technology - they are pushing the boundaries.</li>
<li>In terms of application types in browsers - WebSockets most definitely fit the move to Single Page Applications (SPAs).</li>
</ul>
<h2>Doesn't WS present new types of security issues?</h2>
<ul>
<li>The protocol deals with security considerations. It's then up to the runtime to ensure that an application doesn't do anything naughty - that's no different from any other technology.</li>
</ul>
<h2>Why isn't WS just a slightly better Comet?</h2>
<ul>
<li>WebSockets are a technology answering the need for realtime bi-directional communication that was previously answered by Comet solutions - there's no escaping that. But a lot of the HTML5 features are things that let us achieve things we were previously having to jump through hoops to achieve.</li>
<li>It's standardised so the functionality works the same way cross browser</li>
<li>It's not restricted to browsers (nor was Comet) so it means we have a standardised way of achieveing realtime bi-directional communication on the web.</li>
<li>WebSockets work over a single connection so it's much more efficient that comet solutions which required two connections for bi-directional communication.</li>
</ul>
<h2>Why is WS important for cloud services and apps?</h2>
<ul>
<li>The fundamental reason why WebSockets are important is they are a core component in a move to make the web an interactive communication platform. HTML5 gives us a set of tools that let developers build much richer experiences than we could previously but without a realtime interactive aspect we would just be creating static RIAs.</li>
</ul>
<h2>Where are we going next?</h2>
<ul>
<li>WebSockets are not just a browser technology. As I said before, I believe they are a key component for realtime communication on the Web between any client and any server. The Web is now a communication platform and realtime is a massive part of that. There are so many areas where realtime communcation saves time, money, increases user experiences, improves engagment and offers great opportunity that we've only just scatched the surface of the possibilities.</li>
</ul>

---
layout: page
status: publish
published: true
title: Realtime Web Technology Transport Mechanisms
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
wordpress_id: 23606
wordpress_url: "https://www.leggetter.co.uk/?page_id=23606"
date: "2013-01-01 15:18:55 +0000"
date_gmt: "2013-01-01 15:18:55 +0000"
categories: []
tags: []
permalink: /real-time-web-technologies-guide/realtime-web-technology-transport-mechanisms/
---

<p><a name="comet"></a></p>
<h2>Comet</h2>
<p>Comet is an umbrella term for all old HTTP-based hacks which were used to simulate bi-directional realtime communication between a web client and server. It is a phrase that we should hopefully hear mentioned much less over the coming years. WebSockets are where we want to be; browsers and beyond.</p>
<p>Comet solutions tend to use a number of solutions to achieve HTTP Long-Polling or HTTP Streaming. XMLHttpRequest, Forever-IFrame, ActiveX controls and even Java Applets. The most commonly used solutions now are the XMLHttpRequest object, the Forever-IFrame and JSONP Long-Polling.</p>
<p><a name="http-long-polling"></a></p>
<h2>HTTP Long-Polling</h2>
<p><strong>HTTP Long-polling</strong> is a technique used to push updates to a web client. A connection is held open between the web client and the web server so that when the server has new information it can push it to the client. That connection is then closed. A new connection is then established between the client and the server and then wait for another update from the server.</p>
<p><a name="http-streaming"></a></p>
<h2>HTTP Streaming</h2>
<p><strong>HTTP Streaming</strong> is a technique used to push updates to a web client. A persistent connection is held open between the web client and the web server so that when the server has new information it can push it to the client. This is a truly persistent connection that will only drop due to network problems or through user action e.g. navigating away from a web page or the application is closed.</p>
<p><a name="websockets"></a></p>
<h2>WebSockets</h2>
<p><strong>WebSocket</strong> is a specification that allows realtime bi-directional full-duplex communication between a web client and a web server over a single TCP connection. It represents a solution to older Comet <em>hacks</em> that have been used for over 10 years in order to simulate this type of communication.</p>
<p>Although initially created with web browsers in mind it is a specification so can be implemented by any technology that can make a TCP connection. Because of this there are client library appearing in numerous technologies (see <a href="/real-time-web-technologies-guide#websocket-client-libraries">WebSocket Client Libraries</a>.</p>
<p><a name="server-sent-events"></a></p>
<h2>Server Sent Events (EventSource API)</h2>
<p><strong>Server-Sent Events</strong> is a technology for providing uni-directional communication between a web server and web clients in the form of DOM (Document Object Model) events.</p>

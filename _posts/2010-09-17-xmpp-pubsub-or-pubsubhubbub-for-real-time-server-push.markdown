---
layout: post
status: publish
published: true
title: XMPP PubSub or PubSubHubbub for real-time server push?
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 1853
wordpress_url: "http://leggetter.posterous.com/xmpp-pubsub-or-pubsubhubbub-for-real-time-ser"
date: "2010-09-17 09:32:00 +0100"
date_gmt: "2010-09-17 08:32:00 +0100"
categories:
  - Technology
tags:
  - real-time web
  - comet
  - real-time data
  - pubsubhubbub
  - Superfeedr
  - XMPP
permalink: "http://leggetter.posterous.com/xmpp-pubsub-or-pubsubhubbub-for-real-time-ser"
---

<p>In case you hadn't noticed,&nbsp;<a href="http://leggetter.posterous.com/hit-roond-around-the-heed-head-by-a-faash-fis" >when I'm not getting hit by flying trout</a>, I like to think of myself as a bit of <a href="/" >a real-time web guy</a>. However, there's one thing I'd like clarification on, and I'm confident somebody will be able to shed some light on this:</p>
<p />
<strong>What are the differences between </strong><a href="http://xmpp.org/extensions/xep-0060.html"><strong>XMPP PubSub</strong></a><strong> and </strong><a href="http://code.google.com/apis/pubsubhubbub/"><strong>PubSubHubbub</strong></a><strong> and in what situations should each be used?</strong></p>
<p />
I do think I know some details about this but I'd like what I think I know to be confirmed or indeed corrected.</p>
<p />
My knowledge of the real-time web, and specifically real-time client push, comes from working for&nbsp;<a href="http://www.caplin.com/" >Caplin Systems</a>&nbsp;who pioneered building Comet servers around 10 years ago. From working with Caplin Systems and with Comet servers I've gained an understanding of how connections are made&nbsp;using different technologies&nbsp;and maintained in different scenarios. I also believe that I have a good understanding of what the best connection method is to deliver real-time data whether the delivery be from <strong>server to client using real-time client push</strong> or <strong>server to server using PubSubHubub or XMPP PubSub</strong>.</p>
<p />
<span style="font-size: large;">Persistent Connections</span></p>
<p />
Unless the frequency of data updates is very low, and if you want to truly deliver data in real-time, the best type of connection is a persistent one.</p>
<p />
As well as a persistent connection being able to deliver data faster it also means that your data subscriber does not have to handle a new HTTP connection for each piece of data it receives. This can actually be a really big thing.</p>
<p />
As part of building <a href="http://kwwika.com">Kwwika</a> I wrote a demo which integrated the real-time server push&nbsp;capabilities&nbsp;of <a href="http://superfeedr.com">Superfeedr</a> with the real-time client push&nbsp;capabilities&nbsp;of Kwwika to build a <a href="http://superfeedr.kwwika.com">real-time news reader</a>&nbsp;(RTNR) (<a href="/2010/08/26/real-time-news-reader-shows-off-push-to-browser.html">blog article</a>). In order to receive updates from Superfeedr I had to implement a publisher-subscriber outside of the Kwwika infrastructure. I decided to write a&nbsp;<a href="http://superfeedr.com/documentation#pubsubhubbub">PubSubHubbub</a>&nbsp;implementation in ASP.NET so that I could use a few other <a href="http://github.com/Kwwika/Kwwika-Components">.NET Kwwika components</a> to easily integrate with Kwwika.</p>
<p />
So,&nbsp;each time Superfeedr has an update for the&nbsp;RTNR&nbsp;it establishes a HTTP connection to the&nbsp;RTNR PubSubhubbub&nbsp;server and sends the update which is then parsed and pushed into Kwwika to be distributed to subscribing web clients. If the&nbsp;RTNR&nbsp;is subscribing to something that is updating really frequently (such as "google" using <a href="http://superfeedr.com/documentation#track">Superfeedr track</a>) then that can mean the&nbsp;RTNR&nbsp;server has to handle a lot of HTTP requests. Since I am running the demo on a small Amazon Windows instance running IIS it doesn't take all that long, under a heavy load, for the server to stop responding.</p>
<p />
There must be a better way!</p>
<p />
<span style="font-size: large;">Real-time client push</span></p>
<p />
By way of a comparison let's first take a look at real-time client push.</p>
<p />
Before WebSockets provided the simplest way&nbsp;(but as yet not the most reliable since the WebSocket standard is not set in stone and isn't supported cross-browser)&nbsp;to achieve real-time push to a web browser the best connection method was to maintain a streaming and persistent HTTP connection from the publisher to the client subscriber (using an IFRAME, XMLHttpRequest or XDomainRequest). The persistent connection means that the connection has already been established so as soon as the publisher has any new data for the subscriber it can instantly be pushed to it. This means that the data can be delivered to the web browser as close to real-time as possible.</p>
<p />
<span style="font-size: large;">Real-time Server Push</span></p>
<p />
<strong>PubSubHubbub</strong></p>
<p />
PubSubHubbub turns things on it's head in comparison to real-time client push (it actually uses HTTP as it was designed and it's HTTP streaming that uses things in reverse. See <a href="http://en.wikipedia.org/wiki/Reverse_Ajax">Reverse Ajax</a>.). In this case the publisher still pushes the new data to the subscriber but it does it using a HTTP request. The problem with this is that for each push a new HTTP connection needs to be established and the data then needs to be transferred. Establishing a connection takes time and resources so clearly a single persistent connection is a better solution. This is where I think XMPP PubSub is a better solution.</p>
<p />
<strong>XMPP PubSub</strong></p>
<p />
If you need your data to be delivered in truly real-time (or as close to real-time as web technology will allow) then you have to use a persistent connection between the publisher and the subscriber. It's my understanding that since XMPP was developed as an <strong>instant</strong> messaging protocol that it uses a persistent connection.</p>
<p />
<span style="font-size: large;">Conclusion</span></p>
<p />
Here are things as I see them:</p>
<ul>
<li>If you want your data in real-time you should use a persistent connection between the publisher and subscriber.</li>
<li>If you are making a server to server subscription to data that doesn't update all that often&nbsp;and instant real-time doesn't matter&nbsp;then PubSubHubbub is fine.</li>
<li>If you are making a server to server subscription to data that updates very frequently then you need to use a persistent connection and XMPP PubSub is a must.</li>
</ul>
<p>One thing to also consider is if you are subscribing to multiple sources which update frequently then maintaining a persistent connection to each of those sources, assuming they even allow you to, takes a considerable amount of effort and potentially resource. This is where a service like Superfeedr comes in to its own. They manage the subscriptions and connections to the sources for you which means you only need to maintain one persistent connection to Superfeedr. They do all the heavy lifting so you don't have to.</p>
<p><a href="http://leggetter.posterous.com/xmpp-pubsub-or-pubsubhubbub-for-real-time-ser">Permalink</a><br />
| <a href="http://leggetter.posterous.com/xmpp-pubsub-or-pubsubhubbub-for-real-time-ser#comment">Leave a comment&nbsp;&nbsp;&raquo;</a></p>

---
layout: post
status: publish
published: true
title: "Glug, Glug: Guzzle Ayup a Hosted PubSubHubbub Hub Service"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "PubSubHubbub has become the standard protocol for real-time RSS and Atom feed subscription and delivery. But not everybody wants to host their own PubSubHubbub hub in the same way that hardly anybody hosts their own website, and why cloud services in general have become so popular. Guzzle Ayup has entered the market to offer a [...]"
wordpress_id: 15057
wordpress_url: "http://blog.programmableweb.com/?p=19415"
date: "2011-05-18 08:00:22 +0100"
date_gmt: "2011-05-18 07:00:22 +0100"
categories:
  - Technology
tags:
  - real-time data
  - real-time
  - pubsubhubbub
  - Superfeedr
  - RSS
  - realtime
  - APIs
  - Atom
  - Ayup
  - Guzzle Ayup
  - Paris
  - Redis
  - Ruby
permalink: "http://www.programmableweb.com/category/all/news?p=19415"
---

<p><a href="http://www.programmableweb.com/api/guzzle-ayup"><img src="http://www.programmableweb.com/images/apis/at3641.png" alt="Guzzle Ayup!" class="imgRight" /></a>PubSubHubbub has become the standard protocol for real-time RSS and Atom feed subscription and delivery. But not everybody wants to host their own PubSubHubbub hub in the same way that hardly anybody hosts their own website, and why cloud services in general have become so popular. <a href="http://ayup.us/">Guzzle Ayup</a> has entered the market to offer a hosted PubSubHubbub hub service.</p>
<p>Since PubSubHubbub has been around for a while it’s relatively easy for a developer to start using a hub such as Guzzle Ayup (Ayup for short). There are a good number of PubSubHubbub <a href="http://code.google.com/p/pubsubhubbub/wiki/PublisherClients">publisher</a> and <a href="http://code.google.com/p/pubsubhubbub/wiki/SubscriberClients">subscriber</a> clients that can be used. There is also a reasonable amount of documentation on the subject including the <a href="http://code.google.com/p/pubsubhubbub/">Google PubSubHubbub home page</a> and <a href="https://ayup.us/documentation">Ayup’s documentation</a>.</p>
<p>Ayup was created by a web agency based in Paris called <a href="http://lemonchik.com/">Lemonchik</a> following the requirement to provide notifications to a real-time theme-based news aggregator called <a href="http://guzzle.it/">Guzzle</a> and for future web and iOS applications that will require real-time notifications. They were so happy with the final implementation that they decided to build a front-end console and offer it as a public service.</p>
<p><img class="aligncenter size-medium wp-image-19418" title="Ayup User Dashboard - Add a feed" src="http://blog.programmableweb.com/wp-content/ayup_dashboard-266x300.png" alt="" width="266" height="300" /></p>
<p>Marca Tatem of Lemonchik (and Guzzle Ayup) explains a bit more about the internals of the the service:</p>
<blockquote><p>The internals of Ayup are fun to look at. It&#8217;s a ruby application with a Sinatra web-service, and everything is happening in high-performance, RAM only, Resque queues (backed with Redis). Ayup structure is in itself completely scalable, adding a server with hundreds of new workers is a matter of minutes.</p>
</blockquote>
<p>Ayup offer a simple pay for what you use pricing policy and allow you to set a notification limit which can be handy in keeping costs down when subscribed feeds update more than expected. They also offer something called Virtual hubs which Marca explains as:</p>
<blockquote><p>Virtual Hubs are PubSubHubbub hubs content publishers can create to push free notifications to subscribers. For example, let&#8217;s say that you want people to be able to receive instant push notifications each time you publish a story, you simply create a virtual hub ([YourHubName].ayup.us) people can subscribe to (with a subscribe request) and notifications will be sent to their http callback for free.</p>
</blockquote>
<p>Marca continues to explain why Virtual Hubs are a good way of encouraging simple and free access to your content:</p>
<blockquote><p>The difference between a virtual hub and the actual ayup&#8217;s hub is that with a virtual hub, you can only send a subscribe request for a topic that belongs to the virtual hub&#8217;s owner. In other words, if you create a virtual hub, I can&#8217;t send a subscribe request for MacRumor&#8217;s RSS feed. If I want to subscribe to many different feeds without limitations, then I&#8217;ll have to create an Ayup account and pay for sent notifications.</p>
</blockquote>
<p>Ayup’s focus for the near future is to keep things simple by delivering a good experience for developers and good quality of service such as fast and constant notifications and clean ATOM.</p>
<p>At the time of writing there are only two hosted PubSubHubbub hub services (<a href="http://code.google.com/p/pubsubhubbub/wiki/Hubs">Hub implementations and hosted services</a>). The first well-known service <a href="http://superfeedr.com/">Superfeedr</a> and now there is the welcome addition of a second in <a href="http://ayup.us/">Guzzle Ayup</a></p>
<p>Originally written by me and <a href="http://blog.programmableweb.com/2011/05/18/glug-glug-guzzle-ayup-a-hosted-pubsubhubbub-hub-service/">posted on Programmable Web</a></p>

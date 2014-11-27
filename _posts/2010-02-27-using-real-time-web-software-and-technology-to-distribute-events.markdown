---
layout: post
status: publish
published: true
title: Using real-time web software and technology to distribute events
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "I've just come across <a href=\"http://stage.vambenepe.com/\">William Vambenepe's blog</a> and an article called \"<a href=\"http://stage.vambenepe.com/archives/1284\">Waiting for events (in Cloud APIs)</a>\"\_where he discusses how an event system is missing from cloud vendor APIs.\r\n\r\n<img class=\"size-full wp-image-720 alignleft\" title=\"Notification - event\" src=\"http://www.leggetter.co.uk/wp-content/uploads/2010/02/notification_event.jpg\" alt=\"\" width=\"216\" height=\"216\" /> With my interest in Comet I straight away thought of this as a solution to the notification requirement and it's interesting that the article goes on to talk about subscription management and then moves on to thinking about the delivery mechanism which are all key aspects of a good comet implementation:\r\n<blockquote cite=\"http://stage.vambenepe.com/archives/1284\">How do you deliver notifications? Do you keep HTTP connections open through tricks similar to how self-updating web pages work (e.g. COMET, long polling and soon WebSockets)? Or do you just provide a listener endpoint to which the notifier tries to connect (which, in the case of public cloud deployments, means you need to have a publicly-addressable listener, but hopefully not on the same Cloud infrastructure). Do you use XMPP? AMQP? Email? Can I have you hold my events and let me come pull them?</blockquote>\r\n"
wordpress_id: 719
wordpress_url: "http://www.leggetter.co.uk/?p=719"
date: "2010-02-27 11:08:36 +0000"
date_gmt: "2010-02-27 11:08:36 +0000"
categories:
  - Technology
  - Real-Time Web Musings
tags:
  - real-time web
  - comet
  - pubsubhubbub
  - cloud
  - PUSH
permalink: /2010/02/27/using-real-time-web-software-and-technology-to-distribute-events.html
---

<p>I've just come across <a href="http://stage.vambenepe.com/">William Vambenepe's blog</a> and an article called "<a href="http://stage.vambenepe.com/archives/1284">Waiting for events (in Cloud APIs)</a>" where he discusses how an event system is missing from cloud vendor APIs.</p>
<p><img class="size-full wp-image-720 alignleft" title="Notification - event" src="/wp-content/uploads/2010/02/notification_event.jpg" alt="" width="216" height="216" /> With my interest in Comet I straight away thought of this as a solution to the notification requirement and it's interesting that the article goes on to talk about subscription management and then moves on to thinking about the delivery mechanism which are all key aspects of a good comet implementation:</p>
<blockquote cite="http://stage.vambenepe.com/archives/1284"><p>How do you deliver notifications? Do you keep HTTP connections open through tricks similar to how self-updating web pages work (e.g. COMET, long polling and soon WebSockets)? Or do you just provide a listener endpoint to which the notifier tries to connect (which, in the case of public cloud deployments, means you need to have a publicly-addressable listener, but hopefully not on the same Cloud infrastructure). Do you use XMPP? AMQP? Email? Can I have you hold my events and let me come pull them?</p></blockquote>
<p><a id="more"></a><a id="more-719"></a>However, when considering a notification system such as this you need to consider <strong>how frequently</strong> events would actually occur. How often would a new virtual machine in the cloud be spun up? How frequently do virtual machines unexpectedly crash? In relation to events in other scenarios such as stock rate updates or events within the <a href="http://www.premierleague.com">Premier League</a> between 15:00 and 17:00 on a Saturday, probably not all that frequently.</p>
<p>You also need to think about <strong>what would be consuming the event</strong>. Would it be an application with a user interface that prompts the user to take action or would it be an application with built in logic to handle a virtual machine failure event? If the application is running on a server then there is no reason why that server couldn't be informed of the event via a single call to a web service, or maybe using something such as <a href="http://code.google.com/p/pubsubhubbub/">PUbSubHubbub</a>, rather than holding open a connection to the cloud API - William describes this as a "listener endpoint". If the application consuming the event is a web application, maybe the application is the cloud vendors VM dashboard, then Comet would be an ideal choice for instant notification.</p>
<p>Frequency of events and the event consuming application are two key things to consider when thinking about the best way to distribute and consume events using real-time web technologies. As an event-based API developer you may need to consider distributing your events in a number of ways to give application developers the choice.</p>
<p>Are there any notification systems out there that can be used by an API developer to easily distribute events in either way?</p>

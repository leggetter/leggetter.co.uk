---
layout: post
status: publish
published: true
title: Real-time News Reader Shows Off Push-to-Browser
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
excerpt: "<a href=\"http://www.programmableweb.com/api/superfeedr\"><img src=\"http://www.programmableweb.com/images/apis/at1987.png\" alt=\"Superfeedr API\" class=\"imgRight\" /></a>\r\n<a href=\"http://www.programmableweb.com/api/kwwika\"><img src=\"http://www.programmableweb.com/images/apis/at2394.png\" alt=\"Kwwika API\" class=\"imgRight\" /></a>With the real-time web being claimed by some to be one of the core components of Web 3.0 it's unsurprising that we are seeing more <a href=\"http://www.programmableweb.com/apitag/?q=realtime\">real-time APIs</a> and real-time mashups being developed. One mashup has just been created using Kwwika and Superfeedr to demonstrate how two real-time platforms can be integrated to create a <a href=\"http://superfeedr.kwwika.com/\">real-time news reader application</a>."
wordpress_id: 1466
wordpress_url: "http://blog.programmableweb.com/?p=14457"
date: "2010-08-26 08:00:39 +0100"
date_gmt: "2010-08-26 07:00:39 +0100"
categories:
  - Technology
tags:
  - RSS
  - realtime
permalink: "http://www.programmableweb.com/category/all/news?p=14457"
---

<p><a href="http://www.programmableweb.com/api/superfeedr"><img class="imgRight" style="float: right;" src="http://www.programmableweb.com/images/apis/at1987.png" alt="Superfeedr API" /></a><br />
<a href="http://www.programmableweb.com/api/kwwika"><img class="imgRight" style="float: right;" src="http://www.programmableweb.com/images/apis/at2394.png" alt="Kwwika API" /></a>With the real-time web being claimed by some to be one of the core components of Web 3.0 it’s unsurprising that we are seeing more <a href="http://www.programmableweb.com/apitag/?q=realtime">real-time APIs</a> and real-time mashups being developed. One mashup has just been created using Kwwika and Superfeedr to demonstrate how two real-time platforms can be integrated to create a <a href="http://superfeedr.kwwika.com/">real-time news reader application</a>.</p>
<p><a href="http://www.programmableweb.com/api/superfeedr">Superfeedr</a> allows a developer to subscribe to any RSS feed and receive real-time notifications when a change is made to that feed. This is done either using <a href="http://code.google.com/apis/pubsubhubbub/">PubSubHubbub</a> or by polling the source if a push notification system is not available. More recently Superfeedr <a href="http://blog.superfeedr.com/track/filter/xmpp/pubsubhubbub/track/">introduced the ability to track keywords</a> within all the feeds that they are subscribing to. Once Superfeedr has an update it delivers it to your system via its API.</p>
<p><a href="http://www.programmableweb.com/api/kwwika">Kwwika</a> (disclosure: author is a founder) is a relatively new platform used for distributing data between any number of systems or applications in real-time. They also provide <a href="http://wiki.kwwika.com/api">APIs in a number of technologies</a> including JavaScript, which means they make it easy to instantly push real-time updates into a web browser.</p>
<p style="text-align: center;"><object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" width="480" height="385" codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,40,0"><param name="allowFullScreen" value="true" /><param name="allowscriptaccess" value="always" /><param name="src" value="http://www.youtube.com/v/rjb5lNcAFWQ?fs=1&amp;hl=en_GB" /><param name="allowfullscreen" value="true" /><embed type="application/x-shockwave-flash" width="480" height="385" src="http://www.youtube.com/v/rjb5lNcAFWQ?fs=1&amp;hl=en_GB" allowfullscreen="true" allowscriptaccess="always"></embed></object></p>
<p>The Kwwika Superfeedr demo application gives the user the ability to subscribe to any RSS feed or track any keyword in real-time from within a web application by combining Superfeedr’s RSS subscription and keyword tracking functionality and Kwwika’s real-time web browser push to build what can be described as a real-time news reader.</p>
<p>The application has been developed using ASP.NET MVC and JavaScript and the <a href="https://github.com/leggetter/ASP.NET-MVC-PubSubHubbub-Subscriber/tree/Kwwika-Superfeedr-Demo">source code is available on GitHub</a>.</p>
<p>This post was <a href="http://blog.programmableweb.com/2010/08/26/real-time-news-reader-shows-off-push-to-browser/">originally posted on Programmable Web</a>.</p>

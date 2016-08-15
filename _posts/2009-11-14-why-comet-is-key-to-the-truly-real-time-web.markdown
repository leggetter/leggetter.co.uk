---
layout: post
status: publish
published: true
title: Why Comet is key to the Truly Real-Time Web
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
excerpt: "A lot of websites use <a href=\"http://en.wikipedia.org/wiki/Comet_(programming)#Ajax_with_long_polling\">HTTP Polling</a> to update data on on their website or application without the need for the user refreshing the website. This is clearly better than a purely static page, but during the time between each poll the data on the page has the potential of being out of date (stale) so to make a decision based on the information on a potentially stale page can be a risky one.\r\n\r\nThe <a href=\"http://ajaxpatterns.org/HTTP_Streaming#Goal_Story\">normal example</a> given to show the benefits of using <a href=\"http://en.wikipedia.org/wiki/Comet_(programming)\">Comet</a> to achieve full <a href=\"http://en.wikipedia.org/wiki/Push_technology#HTTP_server_push\">HTTP streaming</a> and the importance of non-stale data is of a trader making a trade on an out of date price. Another example is given where a person places a bet using odds that are on screen but do not match up with the odds in the betting system.\r\n\r\nI just read a <a href=\"http://cometdaily.com/2009/11/14/comet-support-for-iis/\">post on Comet Daily</a> about a company called <a href=\"http://www.frozenmountain.com/\">Frozen Mountain</a> who have just released <a href=\"http://www.frozenmountain.com/websync/\">a component that adds Comet Support for IIS</a>. Along with this they've released a <a href=\"https://www.leggetter.co.uk/2009/11/14/why-comet-is-key-to-the-real-time-web.html\">video</a> which doesn't cover the standard example.\r\n"
wordpress_id: 565
wordpress_url: "https://www.leggetter.co.uk/?p=565"
date: "2009-11-14 21:01:57 +0000"
date_gmt: "2009-11-14 21:01:57 +0000"
categories:
  - Technology
tags:
  - real-time web
  - comet
  - real-time data
  - http polling
  - http streaming
  - truly real-time
  - truly real-time web
permalink: /2009/11/14/why-comet-is-key-to-the-truly-real-time-web.html
---

<p>A lot of websites use <a href="http://en.wikipedia.org/wiki/Comet_(programming)#Ajax_with_long_polling">HTTP Polling</a> to update data on on their website or application without the need for the user refreshing the website. This is clearly better than a purely static page, but during the time between each poll the data on the page has the potential of being out of date (stale) so to make a decision based on the information on a potentially stale page can be a risky one.</p>
<p>The <a href="http://ajaxpatterns.org/HTTP_Streaming#Goal_Story">normal example</a> given to show the benefits of using <a href="http://en.wikipedia.org/wiki/Comet_(programming)">Comet</a> to achieve full <a href="http://en.wikipedia.org/wiki/Push_technology#HTTP_server_push">HTTP streaming</a> and the importance of non-stale data is of a trader making a trade on an out of date price. Another example is given where a person places a bet using odds that are on screen but do not match up with the odds in the betting system.</p>
<p>I just read a <a href="http://cometdaily.com/2009/11/14/comet-support-for-iis/">post on Comet Daily</a> about a company called <a href="http://www.frozenmountain.com/">Frozen Mountain</a> who have just released <a href="http://www.frozenmountain.com/websync/">a component that adds Comet Support for IIS</a>. Along with this they've released a <a href="/2009/11/14/why-comet-is-key-to-the-real-time-web.html">video</a> which doesn't cover the standard example.<br />
<a id="more"></a><a id="more-565"></a><br />
<a name="comet-example-video"></a><br />
<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" width="400" height="270" codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,40,0"><param name="allowfullscreen" value="true" /><param name="allowscriptaccess" value="always" /><param name="src" value="http://vimeo.com/moogaloop.swf?clip_id=4748722&amp;server=vimeo.com&amp;show_title=1&amp;show_byline=1&amp;show_portrait=0&amp;color=&amp;fullscreen=1" /><embed type="application/x-shockwave-flash" width="400" height="270" src="http://vimeo.com/moogaloop.swf?clip_id=4748722&amp;server=vimeo.com&amp;show_title=1&amp;show_byline=1&amp;show_portrait=0&amp;color=&amp;fullscreen=1" allowscriptaccess="always" allowfullscreen="true"></embed></object></p>
<p>It's possible that in this example that a polling solution might actually be just as suitable but this is a good demonstration of the benefits of Comet. In the example Comet provides almost instant feedback on the number of available tickets to potential buyers. This has two benefits. The first is that the user (Bob in the video) has less of a chance of missing out on his tickets. The second is more of a commercial benefit in that the user gets instant feedback on the popularity of the event and availability of the tickets and is more likely to make an instant purchase.</p>
<p>Until a solution such as Comet is used the data that a user sees, in a event booking, trading, betting or even search system, cannot be classed as part of the <strong>truly real-time web</strong>.</p>

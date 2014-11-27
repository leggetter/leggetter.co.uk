---
layout: post
status: publish
published: true
title: Real-Time Rich Internet Applications (RTRIA)
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "<strong>Real-Time Rich Internet Applications</strong> (<strong>RTRIA</strong>s) are <a href=\"http://en.wikipedia.org/wiki/Rich_Internet_application\">RIA</a>s that consume and display real-time data. They have all the characteristics of an RIA with the added feature that data is being pushed to them in real-time as soon as it becomes available. This is in contrast to the current polling solution employed by most RIAs or other web applications that display updating data.\r\n\r\nI mentioned <strong>RTRIA</strong>s for the first time back in April 2009 in a post called \"<a href=\"http://blog.caplin.com/2009/04/20/what-is-the-real-time-web/\">What is the real-time web</a>\" on the Caplin Systems Platformability blog, and since then there has been a real-time web explosion. The \"real-time web\" is now <strong>the</strong> buzz phrase around the Internet that everybody is jumping on. Back in April I set up a <a href=\"http://www.google.com/alerts\">Google Alert</a> for the term \"real-time web\". Back then I got maybe one Google Alert a day for this term, probably less. Now, I get at least two dense emails a day from Google with people using the term for all sorts of things; real-time web stats, real-time analytics, real-time search, <a href=\"http://rsscloud.org/\">rssCloud</a>, <a href=\"http://code.google.com/p/pubsubhubbub/\">pubsubhubbub</a>, the list goes on. <em>This is not the real-time web!</em> Whilst some of the things on this list will help \_the web become <em>truly real-time</em> (rssCloud and pubsubhubbub may even form the back bone), none of these things give the user a truly real-time web experience.\r\n\r\n"
wordpress_id: 456
wordpress_url: "http://www.leggetter.co.uk/?p=456"
date: "2009-10-29 10:15:06 +0000"
date_gmt: "2009-10-29 10:15:06 +0000"
categories:
  - Technology
tags:
  - silverlight
  - real-time web
  - RTRIA
  - real-time data
  - real-time
  - flash
  - rssCloud
  - pubsubhubbub
  - RIA
permalink: /2009/10/29/real-time-rich-internet-applications-rtria.html
---

<p><strong>Real-Time Rich Internet Applications</strong> (<strong>RTRIA</strong>s) are <a href="http://en.wikipedia.org/wiki/Rich_Internet_application">RIA</a>s that consume and display real-time data. They have all the characteristics of an RIA with the added feature that data is being pushed to them in real-time as soon as it becomes available. This is in contrast to the current polling solution employed by most RIAs or other web applications that display updating data.</p>
<p>I mentioned <strong>RTRIA</strong>s for the first time back in April 2009 in a post called "<a href="http://blog.caplin.com/2009/04/20/what-is-the-real-time-web/">What is the real-time web</a>" on the Caplin Systems Platformability blog, and since then there has been a real-time web explosion. The "real-time web" is now <strong>the</strong> buzz phrase around the Internet that everybody is jumping on. Back in April I set up a <a href="http://www.google.com/alerts">Google Alert</a> for the term "real-time web". Back then I got maybe one Google Alert a day for this term, probably less. Now, I get at least two dense emails a day from Google with people using the term for all sorts of things; real-time web stats, real-time analytics, real-time search, <a href="http://rsscloud.org/">rssCloud</a>, <a href="http://code.google.com/p/pubsubhubbub/">pubsubhubbub</a>, the list goes on. <em>This is not the real-time web!</em> Whilst some of the things on this list will help  the web become <em>truly real-time</em> (rssCloud and pubsubhubbub may even form the back bone), none of these things give the user a truly real-time web experience.</p>
<p><a id="more"></a><a id="more-456"></a></p>
<p>My opinion about what the real-time web is has not changed from that <a href="http://blog.caplin.com/2009/04/20/what-is-the-real-time-web/">first blog post</a>. For me, it's not just about <em>data being available</em> as soon as it's been published. In this situation the user still has to actively make a request to see if any data is available. Instead it's about making a single request for data (a <em>subscription</em>) and that data being pushed to your RIA to be consumed by the application user in real-time. Quite a few applications have implemented a polling solution (more on this later) but the experience presented to the user is not <em>truly real-time</em>.</p>
<p>[caption id="attachment_463" align="alignnone" width="659" caption="&quot;Real-Time?&quot;"]<a href="/wp-content/uploads/2009/10/real-time-web-twitter-search.png"><img class="size-full wp-image-463" title="Twitter &quot;real-time web&quot; search results" src="/wp-content/uploads/2009/10/real-time-web-twitter-search.png" alt="&quot;Real-Time&quot;" width="659" height="429" /></a>[/caption]</p>
<p>In my opinion the only way to guarantee being able to deliver <em>truly real-time data</em> (<strong>TRTD</strong>) to a web application is by maintaining a streaming connection to the source of the data using a <em>continuous</em> streaming HTTP connection. Most web applications use a technique called polling or <a href="http://en.wikipedia.org/wiki/Push_technology#Long_polling">long polling</a> to retrieve their data which means that although the data is initially "fresh", within seconds it could be out of date, or more information may be available. I'll discuss server technologies further in a later post.</p>
<p>At the moment there are a number of technologies that allow you to develop RTRIAs. <a href="http://en.wikipedia.org/wiki/Ajax_(programming)">Ajax</a>, <a href="http://www.microsoft.com/SILVERLIGHT/overview/default.aspx">Silverlight</a> and <a href="http://www.adobe.com/flashplatform/">Flash</a> are the three mainstream solutions. The core barriers to RTRIAs are the scalability of server technology and access to truly real-time data.</p>

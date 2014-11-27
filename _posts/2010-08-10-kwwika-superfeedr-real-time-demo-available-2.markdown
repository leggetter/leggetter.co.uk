---
layout: post
status: publish
published: true
title: Kwwika-Superfeedr real-time demo available
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "        \r\n\tOver the past few weeks we've been dabbling with first creating a PUbSubHubbub Subscriber and then building a cool real-time demo which integrates the real-time feed goodness from Superfeedr&nbsp;with the real-time client push wickedness of ..."
wordpress_id: 1222
wordpress_url: "http://blog.kwwika.com/kwwika-superfeedr-real-time-demo-available"
date: "2010-08-10 15:30:00 +0100"
date_gmt: "2010-08-10 14:30:00 +0100"
categories:
  - Technology
tags:
  - real-time web
  - Kwwika
  - real-time push
  - Superfeedr
  - RSS
permalink: "http://blog.kwwika.com/kwwika-superfeedr-real-time-demo-available"
---

<p>
	Over the past few weeks we've been dabbling with first creating a <a href="http://superfeedr.com/documentation#pubsubhubbub_implementation" >PUbSubHubbub Subscriber</a> and then building <a href="http://superfeedr.kwwika.com" >a cool real-time demo</a> which integrates the real-time feed goodness from <a href="http://superfeedr.com" >Superfeedr</a>&nbsp;with the real-time client push wickedness of <a href="http://kwwika.com" >Kwwika</a>.</p>
<p />
The demo itself took a couple of days to build and allows a user to subscriber to any RSS feed or track any keyword using Superfeedr. When Superfeedr receives a real-time update it'll push that update to a web server which will then instantly push that update through Kwwika and into the demo web application.</p>
<p />
RSS source &rarr; pubsubhubbub &rarr; Superfeedr &rarr; pubsubhubbub &rarr; webserver &rarr; Kwwika &rarr; Web client</p>
<p />
The application shows RSS and track updates in real-time in a web client which you could think of it like a real-time push RSS reader. We're hosting the application and are&nbsp;restricting the demo to 10 subscriptions unless you have logged in to use your own dedicated demo. If you want your own dedicated demo then you'll first need a Superfeedr account and then <a href="http://kwwika.com/Contact">get in touch with us at Kwwika</a> and we'll set up the demo account for you on our servers. Once that's done you'll be able to log into the demo using your Superfeedr credentials. More information on <a href="http://wiki.kwwika.com/demos/kwwika-superfeedr-demo#TOC-How-to-get-your-own-dedicated-demo" >setting up a dedicated demo can be found&nbsp;on the Kwwika Wiki</a>.<br />
<a href='http://posterous.com/getfile/files.posterous.com/kwwika/Bu0c9DiJyL1WFj7S9K3156z2e3zD7eJHdtZbTnQ5gbGq9mPaFs684FQmsLwD/Kwwika-SuperfeedrDemoScreen.png.scaled.1000.jpg'><img src="http://posterous.com/getfile/files.posterous.com/kwwika/2B62K6qLiwFCNf2zorcH1B3C1XQ3HEaJYS6owrVCrz1522WafYhnZLZtrxfL/Kwwika-SuperfeedrDemoScreen.png.scaled.500.jpg" width="500" height="299"/></a></p>
<p>If you are a developer you'll be pleased to know that the the <a href="http://github.com/kwwika/ASP.NET-MVC-PubSubHubbub-Subscriber/tree/Kwwika-Superfeedr-Demo" >source code for this application is available on GitHub</a>. The code is an <a href="http://asp.net">ASP.NET</a> MVC solution although you could easily take the principles and create the demo in almost any other language. Just <a href="http://kwwika.com/Contact">get in touch</a> if you are interested.<br />
It's also important to remember that this is a pretty simple demo and that this technology has a lot of potential. Even this demo can be improved in terms of usability, feed parsing to ensure all the information a user could need is pushed through, pulling in older feed items from some of the subscriptions, pausing updates, some general UI updates (which are in the pipeline) and so much more. Why not take the code and see what you can do with this? We'd be happy to help!</p>
<p />
Here's a little walk through of the demo:<br />
<object height="300" width="500"><param name="movie" value="http://www.youtube.com/v/rjb5lNcAFWQ&hl=en&fs=1&hd=1" /></param><param name="wmode" value="window" /><param name="allowFullScreen" value="true" /></param><param name="allowscriptaccess" value="always" /></param><embed src="http://www.youtube.com/v/rjb5lNcAFWQ&hl=en&fs=1&hd=1" allowfullscreen="true" type="application/x-shockwave-flash" allowscriptaccess="always" wmode="window" height="300" width="500"></embed></object></p>
<p />
So, why not try out the <a href="http://superfeedr.kwwika.com">Kwwika-Superfeedr demo</a> and let us know what you think.</p>
<p><a href="http://blog.kwwika.com/kwwika-superfeedr-real-time-demo-available">Permalink</a> </p>
<p>	| <a href="http://blog.kwwika.com/kwwika-superfeedr-real-time-demo-available#comment">Leave a comment&nbsp;&nbsp;&raquo;</a></p>

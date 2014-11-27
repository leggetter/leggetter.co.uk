---
layout: post
status: publish
published: true
title: Plotting tweets in real-time using Smoothie Charts and Kwwika
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "        \r\n\tI noticed a tweet today about real-time JavaScript charts and couldn't resist having a play. The charts are call Smoothie Charts and have been developed by Joe Walnes. You can read the blog post where he announced the release of them here.\r\n\r\n..."
wordpress_id: 1324
wordpress_url: "http://blog.kwwika.com/plotting-tweets-in-real-time-using-smoothie-c"
date: "2010-08-13 01:35:00 +0100"
date_gmt: "2010-08-13 00:35:00 +0100"
categories:
  - Technology
tags:
  - JavaScript
  - real-time web
  - Smoothie
permalink: "http://blog.kwwika.com/plotting-tweets-in-real-time-using-smoothie-c"
---

<p>I noticed a tweet today about real-time JavaScript charts and couldn't resist having a play. The charts are call <a href="http://smoothiecharts.org/" >Smoothie Charts</a> and have been developed by <a href="http://joewalnes.com/" >Joe Walnes</a>. You can read the blog post where he announced the release of them <a href="http://joewalnes.com/2010/08/10/introducing-smoothie-charts/" >here</a>.</p>
<p>The demos that I've seen don't use real-time data so I thought I would create a small demo using real-time tweets being pushed through Kwwika. I updated the Kwwika TweetStreamer component (which I must get around to putting in GitHub) to push through updates from some popular hashtags including #nowplaying, #news, #tech and a few others and then wrote a bit of code to count the number of tweet updates over an interval and push that value into a Smoothie chart. The result looks like this (Smoothie charts use Canvas so only work in some browsers. I've tested this demo in Firefox and Chrome):</p>
<p><a href='http://posterous.com/getfile/files.posterous.com/kwwika/XGJM92hzwVJon8G7UYu9VoIu8Ncy5AoVYCQyMPtxFEBOL7wNI0ZgzxFjoRe6/smoothie-charts-kwwika-demo.png.scaled.1000.jpg'><img src="http://posterous.com/getfile/files.posterous.com/kwwika/PaXOMHgzq7ZlJRSoWUekNYeXTrBMOcrMokg1wVHAwhV2ABdjYPtNgJSWqHGe/smoothie-charts-kwwika-demo.png.scaled.500.jpg" width="500" height="310"/></a></p>
<p>You can see the <a href="http://kwwika.com/Standalone/Demos/javascript-examples/smoothie-twitter-charting/" >Smoothie Twitter Real-Time Charting demo using Kwwika</a> here:&nbsp;<a href="http://kwwika.com/Standalone/Demos/javascript-examples/smoothie-twitter-charting/" >http://kwwika.com/Standalone/Demos/javascript-examples/smoothie-twitter-charting/</a></p>
<p>I've got the Smoothie chart showing the number of updates for each twitter hashtag, a table showing the count and a list of the tweets at the bottom.</p>
<p>The <a href="http://github.com/kwwika/javascript-examples/tree/master/smoothie-twitter-charting/">code is in GitHub</a> so feel free to fork/download and have a play yourself. You can run the code on <strong>http://localhost</strong> but in order to get the code to work on your own website you'll need to register with Kwwika and get in touch to let us know you want access to the real-time Twitter hashtag topics.</p>
<p><strong>Update</strong>: We found a bug in the Smoothie library which&nbsp;<a href="http://joewalnes.com/" >Joe Walnes</a>&nbsp;promptly fixed.</p>
<p><span style="text-decoration: line-through;">One thing we've noticed is that the Smoothie chart stops working and throws an exception and as yet we've not been able to work out what the problem is due to lack of time. It's probably something to do with not getting any updated values in a TimeSeries. This is what the exception look like in Firebug:</span></p>
<p><span style="text-decoration: line-through;"><a href='http://posterous.com/getfile/files.posterous.com/kwwika/Vp23p7cm97EFrfOilESyaIbwqzm7309thB9Qqs0HPIlHiltIiy6mQsUKd2G7/smoothie-error.png'><img src="http://posterous.com/getfile/files.posterous.com/kwwika/aqZ5qseaLq9M5W2QYP0vXoB3VcFpmZY4pTfQZ0e3CFp3VNffBo6thTOLQL1u/smoothie-error.png.scaled.500.jpg" width="500" height="54"/></a><br />
</span></p>
<p><span style="text-decoration: line-through;">If anybody can work out what the problem is please let us know. Failing that we'll look into it when we can.</span></p>
<p><a href="http://blog.kwwika.com/plotting-tweets-in-real-time-using-smoothie-c">Permalink</a> </p>
<p>	| <a href="http://blog.kwwika.com/plotting-tweets-in-real-time-using-smoothie-c#comment">Leave a comment&nbsp;&nbsp;&raquo;</a></p>

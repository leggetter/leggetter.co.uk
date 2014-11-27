---
layout: post
status: publish
published: true
title: Yahoo’s Open Sourced S4 Could be a Real-time Cloud Platform
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "<img class=\"imgRight\" src=\"http://blog.programmableweb.com/wp-content/s4.png\" alt=\"Yahoo! S4\" width=\"188\" height=\"30\" />In a world where real-time data streams are becoming much more common, and with the volume of that data continuing to increase, it makes sense that a framework would be developed to increase the ease at which that data can be processed. <a href=\"http://s4.io/\">Yahoo! S4</a> isn't the first such framework to be concieved, or even open sourced, but it is likely to massively increase awareness that such frameworks exist, what problems they may help solve and get developers thinking about how they could use the technology and potentially increase the likelihood of somebody moving S4-like capabilities into the cloud and offering it as as service."
wordpress_id: 4221
wordpress_url: "http://blog.programmableweb.com/?p=16860"
date: "2010-12-31 08:00:07 +0000"
date_gmt: "2010-12-31 08:00:07 +0000"
categories:
  - Technology
tags:
  - real-time
  - cloud
  - realtime
  - Yahoo
  - framework
  - MapReduce
  - open source
permalink: "http://www.programmableweb.com/category/all/news?p=16860"
---

<p><img class="imgRight" src="http://blog.programmableweb.com/wp-content/s4.png" alt="Yahoo! S4" width="188" height="30"/>In a world where real-time data streams are becoming much more common, and with the volume of that data continuing to increase, it makes sense that a framework would be developed to increase the ease at which that data can be processed. <a href="http://s4.io/">Yahoo! S4</a> isn&#8217;t the first such framework to be concieved, or even open sourced, but it is likely to massively increase awareness that such frameworks exist, what problems they may help solve and get developers thinking about how they could use the technology and potentially increase the likelihood of somebody moving S4-like capabilities into the cloud and offering it as as service.</p>
<p>The requirement for a &#8220;distributed stream computing platform&#8221; came about for Yahoo! in order to be able to process thousands of search queries per second, from potentially millions of users per day,  to facilitate the generation of highly <a href="http://labs.yahoo.com/node/474">personalized adverts</a> for web search. A new framework was required because Yahoo! felt that <a href="http://en.wikipedia.org/wiki/MapReduce">MapReduce</a>, which is commonly used to process large datasets in batch jobs, was &#8220;hard to apply to stream computational tasks&#8221;.</p>
<p>Yahoo! describe the S4 framework using a number of terms that have become common place in the world of cloud computing:</p>
<blockquote><p>S4 is a general-purpose, distributed, scalable, partially fault-tolerant, pluggable platform that allows programmers to easily develop applications for processing continuous unbounded streams of data.</p>
</blockquote>
<p>Exactly what Yahoo! S4 is, and what it is capable of, has been <a href="http://bit.ly/igjbDu">discussed</a> in a number of other places. The most commonly used term by <a href="http://bit.ly/g2GUVE">comparable frameworks</a> is <em>Complex Event Processing</em> with applications including filtering, correlation and pattern matching. These discussions will no doubt continue but ultimately a framework is something that can be put to multiple uses which is why Yahoo! chose to call it &#8220;general-purpose&#8221;.</p>
<p>Yahoo! have created a <a href="https://github.com/s4/examples">couple of examples</a> to demonstrate some of the basic capabilities and clarify what S4 can do. One of the examples recieves data from the Twitter real-time <a href="http://dev.twitter.com/pages/streaming_api_methods#statuses-sample">Garden Hose</a> stream, counts the number of times a hashtag is mentioned and keeps an ordered list of the most commonly mentioned hashtags. Each step of the process is performed in what Yahoo! are calling <a href="http://wiki.s4.io/Manual/S4Overview#toc6">Processing Elements</a> and it&#8217;s these elements that enforce the separation of each logical step of the process (e.g. recieve update, extract hashtags, count hashtags, order hastag count list)  and allow the execution of the process to take place on a distributed system.</p>
<p>One potential thing holding S4 adoption back is that as yet it&#8217;s not offered as a service. As well as writing their own Processing Elements developers will have to host their own distributed stream computing platform. If S4 proves to be a useful and popular framework then we may start to see <em>hosted</em> distributed stream computing platform services in the same way that we&#8217;ve already seen MapReduce being <a href="http://aws.amazon.com/elasticmapreduce/">offered as a service</a> by Amazon.</p>
<p>Yahoo! S4 is yet another powerful real-time component now available to the Programmable Web. It opens up a number of possibilities for developers to start building exciting data-centric applications, mashups or hosted services which could integrate with other components such as <a href="http://www.programmableweb.com/apitag/realtime">real-time APIs</a>, <a href="http://blog.programmableweb.com/2010/09/14/client-push-services-open-up-real-time-to-everyone/">real-time client push services</a> and <a href="http://blog.programmableweb.com/?s=%22data%20as%20a%20service%22">DaaS</a> services.</p>
<p><a href="http://blog.programmableweb.com/2010/12/31/yahoos-open-sourced-s4-could-be-a-real-time-cloud-platform/">Originally posted on Programmable Web</a></p>

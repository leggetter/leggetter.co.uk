---
layout: post
status: publish
published: true
title: The benefits of Real-Time Push-Once
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "        \r\n\tThere's so much excitement about real-time push technologies that quite often, in fact almost always, the benefits of using push are overlooked, forgotten, or simply not known. The technology excites programmers who want to use it, want to k..."
wordpress_id: 1325
wordpress_url: "http://blog.kwwika.com/the-benefits-of-real-time-push-once"
date: "2010-08-12 12:02:00 +0100"
date_gmt: "2010-08-12 11:02:00 +0100"
categories:
  - Technology
tags:
  - real-time web
  - real-time data
  - Kwwika
  - real-time push
  - real-time push-once
permalink: "http://blog.kwwika.com/the-benefits-of-real-time-push-once"
---

<p>There's so much excitement about real-time push technologies that quite often, in fact almost always, the benefits of using push are overlooked, forgotten, or simply not known. The technology excites programmers who want to use it, want to know how it works or want to write their own push framework, user experience (UX) professionals who understand how this paradigm shift will massively benefit users, general technologists who can see how the addition of such technology can improve an application or product and entrepreneurs who have the vision to see ground breaking ways of using push.<br />
<a id="more"></a><a id="more-1325"></a></p>
<h3>The understood benefits</h3>
<p>The cost and resource benefits that real-time push bring start to be considered when the excitement of the technology dies down and you start talking in detail about using a Cloud Platform as a Service (PAAS) such as Kwwika. Kwwika provides the more obvious benefit of <strong>allowing anybody to publish and add real-time data</strong> to any web page, web application, Rich Internet Application (RIA), desktop or service application and <strong>share information</strong> between all these and from a number of different sources. The first thoughts of resource and cost saving are when you start to consider that by using a service you don't need to <strong>buy servers to host your real-time push servers</strong>, you don't need to <strong>spend time and effort installing, setting up and learning how to use the software</strong>, you don't need to worry about <strong>maintaining the software and handling upgrades</strong> and you don't need to worry about <strong>how you deal with scaling your servers</strong> to meet increased demand as well as keeping resource usage to a minimum during lean spells. Kwwika offers all the benefits of a hosted scalable service, but for real-time push streaming as a service. This means you can concentrate on building your application, developing your product or service and winning business.</p>
<h3>The benefits of real-time push-once</h3>
<p>The best way to understand one of the fundamental, but as yet hidden, benefits of Kwwika, and ultimately <strong>real-time push-once</strong>, is through an example:</p>
<p>Imagine a website known as the best destination for up to the second sports information for the newest and most popular sports of all time: Multiball. It's a mixture of all the most popular sports including football (soccer), baseball, basketball, rugby, tennis, cricket and motor sports. This new game is fast paced and jam packed with statistics which change every second. Today there is a really big game on between Great Britain and USA. The world wants to watch this game but it's during the day for many people who will be at work in front of their computers so they'll be logging on to this well known website to keep up to date with the scores. The game is tied in the 4th quarter with only 1 minute remaining and millions of users from around the world starting hitting the F5 key and clicking the "Refresh" button in their web browser to refreshing the website and check for the latest score. The servers hosting the website can't handle the load and crash.</p>
<p><a href="http://posterous.com/getfile/files.posterous.com/temp-2010-08-12/emicJHeBxkfyAJlsecpFzlfBsdaHulwbzhxoCpmfpFCeGpkJApGEqDwJtCvF/1_request.jpg.scaled1000.jpg"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-08-12/emicJHeBxkfyAJlsecpFzlfBsdaHulwbzhxoCpmfpFCeGpkJApGEqDwJtCvF/1_request.jpg.scaled500.jpg" alt="" width="500" height="375" /></a></p>
<p>Some websites try to get around this scenario by adding some script to their score web page which polls the server for an update at a set interval. The problem with this is that the web server still has to deal with, in effect, a refresh although the data returned to the request can be much smaller.<br />
<a href="http://posterous.com/getfile/files.posterous.com/temp-2010-08-12/nxbnbztqnxntaAxFesgwhteAECvpzhJxfDrpsDypBbqHtqjAGCcmupxxcCtg/2_polling.jpg.scaled1000.jpg"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-08-12/nxbnbztqnxntaAxFesgwhteAECvpzhJxfDrpsDypBbqHtqjAGCcmupxxcCtg/2_polling.jpg.scaled500.jpg" alt="" width="500" height="375" /></a></p>
<p>The most obvious use of a real-time push system is that as soon as a server (or score system) receives new information it can push it to any application instance that is interested in that information. In the above Multibal' website example the application instance is each web browser session logged on to the website. If the sports website were using a real-time push system this would mean that they could instantly push any changes in the score to each web browser session which would mean that each website user wouldn't need to refresh their page (reloading the whole page) to check if the score had changed.</p>
<p><a href="http://posterous.com/getfile/files.posterous.com/temp-2010-08-12/sqaormAyqhsreIEHwusGockbqJDiFzymlbBAqjvcwmrspBywepneaoaaIqBy/3_push.jpg.scaled1000.jpg"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-08-12/sqaormAyqhsreIEHwusGockbqJDiFzymlbBAqjvcwmrspBywepneaoaaIqBy/3_push.jpg.scaled500.jpg" alt="" width="500" height="375" /></a><br />
This alone would take a massive load off of the sports website infrastructure, but it's possible to take things even further.</p>
<p>Even in the real-time push scenario the sports website would need to build and maintain the real-time push infrastructure and push an update to each of the millions of website users. From the information above you'll know that real-time push services can help them out with the infrastructure. The new, and game changing feature that Kwwika offers is that when Rooney Giggs McFadden makes that game winning manoeuvre-score for Great Britain the sports website would only need to publish the score update once into the Kwwika service (<strong>real-time push-once</strong>). Kwwika would then instantly distribute that update to the millions of website users. This means the website only ever needs to deal with single page loads from its users and <strong>push</strong> out each score change or game statistic <strong>once</strong>, Kwwika does the rest.</p>
<p><a href="http://posterous.com/getfile/files.posterous.com/temp-2010-08-12/CbdGIHdcaoanDevyHclykADCGefAbIlpGvstftlpmAytbFnbHmncFphptFBH/4_push-once.jpg.scaled1000.jpg"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-08-12/CbdGIHdcaoanDevyHclykADCGefAbIlpGvstftlpmAytbFnbHmncFphptFBH/4_push-once.jpg.scaled500.jpg" alt="" width="500" height="375" /></a></p>
<p>Thanks to <a title="Zen Elements Web Design &amp; Development Company | Dundee, Scotland" href="http://zenelements.com/">Zen Elements Web Design &amp; Development</a> for the diagrams</p>
<p><a href="http://blog.kwwika.com/the-benefits-of-real-time-push-once">Permalink</a></p>
<p>| <a href="http://blog.kwwika.com/the-benefits-of-real-time-push-once#comment">Leave a comment  »</a></p>

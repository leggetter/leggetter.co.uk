---
layout: post
status: publish
published: true
title: The current state of Realtime Web Tech for PHP
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 24005
wordpress_url: "http://www.leggetter.co.uk/?p=24005"
date: "2013-10-18 09:24:15 +0100"
date_gmt: "2013-10-18 08:24:15 +0100"
categories:
  - Technology
tags:
  - PHP
  - realtime
  - realtime web
permalink: /2013/10/18/the-current-state-of-realtime-web-tech-for-php.html
---

<p><a href="/wp-content/uploads/2013/10/php-logo.png"><img src="/wp-content/uploads/2013/10/php-logo.png" alt="PHP Logo" width="150" class="alignright size-full wp-image-24009" /></a></p>
<p>I quite frequently see posts on StackOverflow about how to add realtime functionality to a PHP application, or to build a realtime solution with PHP. And I'm increasingly getting emails asking the same. So, here's what I feel the current state of Realtime Web Technology is for PHP:</p>
<p><strong>The solutions for PHP alone are very limited</strong>. There is a framework called <a href="http://reactphp.org/">ReactPHP</a> on top of which Chris Boden has built <a href="http://socketo.me">Ratchet</a>. I've also come across something called <a href="https://github.com/chrisnetonline/WaterSpout-Server">WaterSpout Server</a> which claims to offer WebSockets and HTTP fallback, but I haven't tried it out.</p>
<p>However, as per the book I co-authored with Jason Lengstorf - <a href="http://realtimewebapps.com">Realtime Web Apps</a> - and the articles I've written for Web &amp; PHP (<a href="http://webandphp.com/UnderstandingRealtimePHPApps-166085">Understanding Realtime PHP Apps</a> and <a href="http://webandphp.com/BuildingRealtimeWebAppswithPHP-166928">Building Realtime Web Apps with PHP</a>) the best solution right now is either to use a <a href="/real-time-web-technologies-guide#hosted-services">realtime hosted service</a> or to have a non-PHP solution running in parallel. Lee Boynton wrote a nice article for Web &amp; PHP on integrating <a href="http://webandphp.com/IntegratingNode.jswithPHP">Node.JS with PHP</a> and the Ratchet documentation provides information on <a href="http://socketo.me/docs/push">integrating a realtime solution into a LAMP stack using message queues</a>.</p>
<p>If you know of any other solutions, or believe differently, please get in touch.</p>
<h3>Other Solutions</h3>
<ul>
<li><a href="http://daemon.io/">phpDaemon</a> - Thanks to Filippo for the heads-up.</li>
</ul>

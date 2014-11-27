---
layout: post
status: publish
published: true
title: Kwwika support for webOS
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "        \r\n\tWe&#039;ve got a potential client interested in using Kwwika on HP webOS so we&#039;ve been working with them to test the Kwwika JavaScript library on a platform that we&#039;ve not been directly targeting.\_After a problem glitch with the 64bi..."
wordpress_id: 3553
wordpress_url: "http://blog.kwwika.com/kwwika-support-for-webos"
date: "2010-12-07 16:50:57 +0000"
date_gmt: "2010-12-07 16:50:57 +0000"
categories:
  - Technology
tags:
  - JavaScript
  - hp
  - Kwwika
  - webOS
  - Palm
permalink: "http://blog.kwwika.com/kwwika-support-for-webos"
---

<p>We've got a potential client interested in using Kwwika on HP webOS so we've been <strong>working with them</strong> to test the Kwwika JavaScript library on a platform that we've not been directly targeting. After a problem glitch with the 64bit <a href="http://developer.palm.com/index.php?option=com_content&amp;view=article&amp;layout=page&amp;id=1788&amp;Itemid=21">webOS SDK</a> (mainly JVM and PATH problems) we got the 32bit one up and running and the a webOS emulator fired up. From there Palm have created a really nifty web IDE called <a href="http://ares.palm.com/Ares/about.html">Ares</a>. Ares communicates with the webOS emulator, which runs on <a href="http://www.virtualbox.org/">Virtual Box</a>, via the web browser Java plugin and it allows you to launch the application and debug it. This works surprisingly well.</p>
<div>We came across three <a href="http://leggetter.posterous.com/uncaught-typeerror-cannot-read-property-1-of">problems</a> with the Kwwika JavaScript API where we'd made assumptions that the library would be running within a web browser. We fixed this by stepping through the code with Ares debugger and soon we were connected, logged in, subscribing to data and publishing data.</p>
<p>The code is super-simple since it's just a normal HTML page:</p>
<p>[gist id=732019]</p>
<p><a href="https://gist.github.com/732019"></a>And our application didn't have any UI but you can see from the log at the bottom of this screenshot that the Kwwika JavaScript library is working with webOS as expected.</p>
<p><a href="/wp-content/uploads/2010/12/webOS_Ares.png"><img class="aligncenter size-medium wp-image-3583" title="webOS Ares - using Kwwika" src="/wp-content/uploads/2010/12/webOS_Ares-300x199.png" alt="webOS Ares - using Kwwika" width="300" height="199" /></a></p>
<p><a href="http://blog.kwwika.com/kwwika-support-for-webos">Permalink</a></p>
<p>| <a href="http://blog.kwwika.com/kwwika-support-for-webos#comment">Leave a comment  »</a></p>

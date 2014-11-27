---
layout: post
status: publish
published: true
title: Silverlight uses XCP tmp files for Web Requests
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 691
wordpress_url: "http://www.leggetter.co.uk/?p=691"
date: "2010-02-05 13:41:48 +0000"
date_gmt: "2010-02-05 13:41:48 +0000"
categories:
  - Technology
tags:
  - silverlight
  - csharp
  - httpwebrequest
  - fiddler
permalink: /2010/02/05/silverlight-uses-xcp-tmp-files-for-web-requests.html
---

<p>It would appear that the Silverlight runtime <a href="http://forums.silverlight.net/forums/p/135096/301578.aspx">creates a file named XCP*.tmp of around 20MB within a users %temp% directory</a> (where * can be replaced by random characters). This file would appear to be used in some way by the Silverlight runtime for web requests. If you refresh your Silverlight application then this file is cleaned up. However, if your web request is interrupted in some way then the file can be left in your %temp% directory slowly but surely eating up disk space.</p>
<p>This is particularly noticeable and reproducible if you are using the HttpWebRequest class to stream data (for more <a href="/2010/01/03/msdn-e-book-and-podcast.html">information on streaming data from Silverlight you can listen to my podcast and read my article in a free MSDN book</a>). You can then reproduce the loss of connection using <a href="http://www.fiddler2.com/fiddler2/">Fiddler</a> (which seriously rocks and is becoming more and more useful) by right-clicking on the streaming connection and selecting "Abort Session".</p>
<p>[caption id="attachment_695" align="alignnone" width="529" caption="Fiddler - Abort Session"]<a href="/wp-content/uploads/2010/02/FiddlerAbortSession.png"><img class="size-full wp-image-695 " title="Fiddler - Abort Session" src="/wp-content/uploads/2010/02/FiddlerAbortSession.png" alt="" width="529" height="294" /></a>[/caption]</p>
<p>The best solution to resolve this that I've found is to manually invoke the garbage collector whenever you detect the connection loss.</p>
<p>[csharp]<br />
// Manually invoke Garbage collection<br />
GC.Collect();</p>
<p>[/csharp]</p>

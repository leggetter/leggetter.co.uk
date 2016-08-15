---
layout: post
status: publish
published: true
title: Drag Drop bug in JQuery UI 1.5.3
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
wordpress_id: 95
wordpress_url: "https://www.leggetter.co.uk/?p=95"
date: "2009-01-31 16:11:04 +0000"
date_gmt: "2009-01-31 15:11:04 +0000"
categories:
  - Technology
tags:
  - JavaScript
  - JavaScript JQuery UI Bug
permalink: /2009/01/31/drag-drop-bug-in-jquery-ui-153.html
---

<h3><em>JQuery UI Update - 31/01/2009 @ 17:15</em></h3>
<p><a title="Richard D Worth" href="http://rdworth.org/blog/">Richard Worth</a> just got in touch with me via <a href="http://twitter.com/rworth">twitter</a> to let me know that JQuery UI 1.5.3 is only compatible with JQuery 1.2.6.</p>
<p><q cite="http://twitter.com/rworth/status/1164840041">The bug is not in jQuery UI 1.5.3, but just that 1.5.3 is only compatible with 1.2.6. Only 1.6rc5+ is compatible with jQuery 1.3</q></p>
<p>Therefore to use <a href="http://code.google.com/apis/ajaxlibs/documentation/index.html#jqueryUI">JQuery with JQuery UI from the Google Ajax Libraries</a> hosted service you need to do one of the following:</p>
<h4>Script includes</h4>
<pre name="code" class="html">&lt;script type="text/javascript"
             src="http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.min.js"&gt;
&lt;/script&gt;
&lt;script type="text/javascript"
             src="http://ajax.googleapis.com/ajax/libs/jqueryui/1.5.3/jquery-ui.jss"&gt;
&lt;/script&gt;</pre>
<h4>Google Library loading</h4>
<pre name="code" class="javascript">google.load("jquery", "1.2.6");
google.load("jqueryui", "1.5.3");</pre>
<p>---</p>
<p><a href="http://jquery.com/">JQuery</a> seems to be the most active of the JavaScript libraries at the moment so I decided to use it for a little project. I've also decided to use the <a href="http://code.google.com/apis/ajaxlibs/">Google AJAX Libraries APIs hosted service</a> to serve up the JavaScript files. At present <a href="http://code.google.com/apis/ajaxlibs/documentation/index.html#jqueryUI">Google is hosting JQuery UI</a> version 1.5.3. After a bit of investigation I've determined that there is a bug in the Drag  and Drop functionality in this version. It would appear that the "drop" function is not fired when you try to drop a draggable element on a droppable zone. I verified this by changing the JQuery UI version to the 1.6 RC that the <a href="http://ui.jquery.com/demos/droppable/">JQuery UI droppable demo</a> is using at the moment. When I did this the drag and drop functionality worked as expected.</p>
<p><img class="alignnone" style="background-color:#5f5f5f;" title="JQuery UI" src="http://ui.jquery.com/images/logo.gif" alt="" width="235" height="55" /></p>
<p>This may be a know issue but I thought a small post on the matter might save other people a bit of time. I did have a look at raising a bug but there appears to be a bug in the <a href="http://dev.jqueryui.com/report/10?P=droppable">bug tracking system</a>.</p>

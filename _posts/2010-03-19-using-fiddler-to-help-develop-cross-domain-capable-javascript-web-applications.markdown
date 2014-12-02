---
layout: post
status: publish
published: true
title: Using Fiddler to help develop cross domain capable JavaScript web applications
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "This post is going to be short and sweet. &ldquo;Short&rdquo; because Fiddler makes working around this problem so simple. And &ldquo;Sweet&rdquo; because I think this is really powerful and will allow you to develop applications that show why cross domain access, in some situations, should be allowed. In my last..."
wordpress_id: 758
wordpress_url: "http://www.leggetter.co.uk/?p=758"
date: "2010-03-19 10:50:01 +0000"
date_gmt: "2010-03-19 10:50:01 +0000"
categories:
  - Technology
tags:
  - JavaScript
  - fiddler
permalink: /2010/03/19/using-fiddler-to-help-develop-cross-domain-capable-javascript-web-applications.html
---

<p>This post is going to be short and sweet. “Short” because <a href="http://www.fiddler2.com/fiddler2/">Fiddler</a> makes working around this problem so simple. And “Sweet” because I think this is really powerful and will allow you to develop applications that show why cross domain access, in some situations, should be allowed.</p>
<p>In my last post on <a href="/2010/03/12/making-cross-domain-javascript-requests-using-xmlhttprequest-or-xdomainrequest.html">Making cross domain JavaScript requests using XMLHttpRequest or XDomainRequest</a> I demonstrated that in order to access a resource (web page/web service) the server needs to respond to your application/JavaScript HTTP requests with an HTTP header of <a href="http://www.w3.org/TR/2008/WD-access-control-20080912/#access-control-allow-origin">“Access-Control-Allow-Origin”</a>. The problem arises when you are trying to access a resource that doesn’t presently send the required HTTP header, but you really need it to (I’ve addressed a similar problem to this when developing Silverlight applications and the solution, again, was to use <a href="/2009/10/30/using-fiddler-to-trick-silverlight-into-allowing-a-crossdomain-web-request.html">Fiddler to trick Silverlight into allowing a crossdomain Web Request</a>). For development purposes you’ll need to add the required header to the server HTTP response in your development environment. This is really simple using Fiddler.<br />
<span id="more-758"> </span><br />
All you need to do is add a new custom rule. You can do this via the menu option: <strong>Rules -&gt; Customize Rules…</strong></p>
<div id="attachment_759" class="wp-caption alignnone" style="width: 409px;">
<p><a class="thickbox no_icon" title="Customize Rules" rel="gallery-758" href="/wp-content/uploads/2010/03/CustomizeRules.png"><img class="size-full wp-image-759" title="Customize Rules" src="/wp-content/uploads/2010/03/CustomizeRules.png" alt="" width="399" height="289" /></a></p>
<p class="wp-caption-text">Fiddler Customize Rules option</p>
</div>
<p>This will bring up a JScript.NET file (if you don’t like the thought of JScript you can just pretend it’s JavaScript) called <em>CustomRules.js</em>. In that file you will see a number of functions/methods that are called at certain points during an HTTP request or response. The method we are interested in is called <code>OnBeforeResponse</code> and what we want to do is to add the <em>Access-Control-Allow-Origin</em> header to trick the browser/scripting engine into thinking that the resource we are requesting allows the cross domain request.</p>

```js
static function OnBeforeResponse(oSession: Session)
{
	oSession.oResponse.headers.Add("Access-Control-Allow-Origin", "*");
}
```

<p>The code above will add this header to all HTTP responses. You can of course add an <code>if</code> statement so that the header is only added when a particular condition is matched, such as a responses from <a href="/">http://www.leggetter.co.uk</a>.</p>

```js
static function OnBeforeResponse(oSession: Session)
{
	if (oSession.HostNameIs("www.leggetter.co.uk"))
	{
		oSession.oResponse.headers.Add("Access-Control-Allow-Origin", "*");
	}
}
```

<p><small>The code snippet above has not been tested</small></p>
<p>Once you have added your code to the <code>OnBeforeResponse</code> method you can save and close the CustomRules.js file. Fiddler will detect that this file has been modified and compile it in the background so that it can use the new code with each request and response that it processes.</p>
<p>The next time that Fiddler is processing an HTTP response it will call this method, your code will run, and the <em>Access-Control-Allow-Origin</em> HTTP header added to the response.</p>

```
HTTP/1.1 200 OK
Connection: close
Date: Fri, 19 Mar 2010 11:04:51 GMT
Server: Microsoft-IIS/6.0
Content-Type: text/html; charset=utf-8
Expires: Fri, 19 Mar 2010 11:03:51 GMT
Cache-Control: no-cache
Pragma: no-cache
Access-Control-Allow-Origin: *
```

<p>For more information on custom rules and generally developing using Fidder see their <a href="http://www.fiddler2.com/Fiddler/dev/">Developer Info section</a>.</p>

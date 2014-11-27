---
layout: post
status: publish
published: true
title: Basic Authentication against the Superfeedr HTTP PubSubHubbub API using a .NET HttpWebRequest
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "        \r\n\tIt would appear that setting the Credentials property of a HttpWebRequest still leads to authentication failure against the Superfeedr HTTP PubSubHubbub API. This might be because the way the HttpWebRequest works is that it first waits to be..."
wordpress_id: 984
wordpress_url: "http://blog.kwwika.com/basic-authentication-against-the-superfeedr-h"
date: "2010-07-04 10:58:00 +0100"
date_gmt: "2010-07-04 09:58:00 +0100"
categories:
  - Technology
tags:
  - .NET
  - "C#"
  - pubsubhubbub
  - Superfeedr
permalink: "http://blog.kwwika.com/basic-authentication-against-the-superfeedr-h"
---

<p>It would appear that setting the Credentials property of a HttpWebRequest still leads to authentication failure against the <a href="http://superfeedr.com/documentation#pubsubhubbub">Superfeedr HTTP PubSubHubbub API</a>. This might be because the way the HttpWebRequest works is that it first waits to be challenged for credentials via a 401 (not authorized) and then replies with the authentication (<a href="http://www.west-wind.com/weblog/posts/243915.aspx">more info include PreAuthenticate here</a>).</p>
<p>So, this doesn't work:<br />
[code lang="csharp"]<br />
string username = &quot;username&quot;;<br />
string password = &quot;password&quot;;<br />
HttpWebRequest request = (HttpWebRequest)WebRequest.Create(&quot;url-here&quot;);<br />
request.Credentials = new NetworkCredential(username, password);<br />
[/code]</p>
<p>To work around this you need to force the authentication to be sent. I found the details of how to do this in a blog post by Ian Dykes here:</p>
<p><a href="http://devproj20.blogspot.com/2008/02/assigning-basic-authorization-http.html">http://devproj20.blogspot.com/2008/02/assigning-basic-authorization-http.html</a></p>
<p>But for fullness here's the code:</p>
<p>[code lang="csharp"]<br />
string username = &quot;username&quot;;<br />
string password = &quot;password&quot;;<br />
byte[] authBytes = Encoding.UTF8.GetBytes(username + &quot;:&quot; + password.ToCharArray());<br />
request.Headers[&quot;Authorization&quot;] = &quot;Basic &quot; + Convert.ToBase64String(authBytes);<br />
[/code]</p>
<p><a href="http://blog.kwwika.com/basic-authentication-against-the-superfeedr-h">Permalink</a> </p>
<p>	| <a href="http://blog.kwwika.com/basic-authentication-against-the-superfeedr-h#comment">Leave a comment&nbsp;&nbsp;&raquo;</a></p>

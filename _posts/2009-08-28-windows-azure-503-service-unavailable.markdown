---
layout: post
status: publish
published: true
title: Windows Azure - 503 Service Unavailable
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 271
wordpress_url: "http://www.leggetter.co.uk/?p=271"
date: "2009-08-28 00:44:57 +0100"
date_gmt: "2009-08-27 23:44:57 +0100"
categories:
  - Technology
tags:
  - .NET
  - Software Development
  - Windows Azure
  - ASP.NET MVC
permalink: /2009/08/28/windows-azure-503-service-unavailable.html
---

<p>I finally got around to trying out ASP.NET MVC and while I was at it I thought I'd also give Windows Azure a whirl. Windows Azure doesn't support ASP.NET MVC out of the box but Jim over on MSDN Blogs has written up the details of how to get <a href="http://blogs.msdn.com/jnak/archive/2008/10/28/asp-net-mvc-projects-running-on-windows-azure.aspx">ASP.Net MVC Projects running on Windows Azure</a>.</p>
<h3>Problem</h3>
<p>So, I followed the instruction from the blog and uploaded the package and configuration file, waited for the staging application to get into a runnable state, and clicked on the staging link...</p>
<blockquote><p>Windows Azure - 503 Service Unavailable</p></blockquote>
<p>Clearly not a good thing! In addition to this error I occasionally got a random network error or a full-on connection error reported by the browser.</p>
<p>I tried googling for this error but there was nothing about this problem after deploying to the real Windows Azure hosting (the cloud). As far as I can tell there's no way of getting any debug information or logs to work out what's going wrong. Maybe this is something that Microsoft will add later on?</p>
<h3>Solution</h3>
<p>Then it struck me that I hadn't actually set up any kind of TableStorage on my Windows Azure hosting so I removed all mentions of storage and database connections from the MVC application. This included editing Web.config and removing the following.</p>
<ul>
<li>The &lt;section name="authenticationService" type="System.Web.Configuration.ScriptingAuthenticationServiceSection, System.Web.Extensions, Version=3.5.0.0, Culture=neutral, PublicKeyToken=31BF3856AD364E35" requirePermission="false" allowDefinition="MachineToApplication" /&gt; section element.</li>
<li>The &lt;connectionStrings&gt; element</li>
<li>The &lt;membership&gt;element</li>
<li>The &lt;authentication mode="Forms"&gt; element</li>
<li>The &lt;profile&gt; element</li>
<li>The &lt;roleManager&gt;element</li>
</ul>
<p><strong><em>Update: I've found that without the &lt;authentication&gt;element I started getting the error below so you may want to instead replace it with :</em></strong></p>
<blockquote><p>CCT: Role instances did not start within the time allowed.  Please try again.  If you continue to encounter this behavior please try shutting down the Development Fabric.</p></blockquote>
<p>I'm guessing that not all of these elements actually need to be removed but doing so resulted in the MVC ASP.NET application working in Windows Azure.</p>
<p><strong><em>Update 2: ServiceDefinition.csdef</em></strong></p>
<p>If you happen to get network timeouts or 404 network connection issues it's worth checking your ServiceDefinition.csdef to make sure that you've got port 80 configured. I noticed that mine had updated to port 8080 so obviously I couldn't access the staging site on port 80 like I was trying. If you do have the port set to something else other than port 80 you can use that port to access your application but the ServiceDefinition.csdef does have a comment in there telling you your application should be on port 80 so you are probably best to stick with that.</p>
<blockquote><p>&lt;!-- Must use port 80 for http and port 443 for https when running in the cloud --&gt;<br />
&lt;InputEndpoint name="HttpIn" protocol="http" port="80" /&gt;</p></blockquote>

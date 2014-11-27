---
layout: post
status: publish
published: true
title: "System.Security.SecurityException: That assembly does not allow partially trusted callers"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 268
wordpress_url: "http://www.leggetter.co.uk/?p=268"
date: "2009-08-26 00:51:12 +0100"
date_gmt: "2009-08-25 23:51:12 +0100"
categories:
  - Technology
tags:
  - "C# Snippets"
  - .NET
  - Windows Azure
  - ASP.NET MVC
permalink: /2009/08/26/system-security-securityexception-that-assembly-does-not-allow-partially-trusted-callers.html
---

<p>I was writing a Windows Azure ASP.NET MVC application and when making a call to a page I received the following exception:</p>
<blockquote><p>System.Security.SecurityException: That assembly does not allow partially trusted callers</p></blockquote>
<p>In my application I'm using <a href="http://www.castleproject.org/container/index.html">Castle Windsor</a> for dependency injection and when trying to resolve a service using:</p>
<div id="_mcePaste" style="position: absolute; left: -10000px; top: 0px; width: 1px; height: 1px; overflow-x: hidden; overflow-y: hidden;">}</div>
<blockquote><p>IGravatar gravatar = MvcApplication.Container.Resolve&lt;IGravatar&gt;();</p></blockquote>
<p>I received this message. To solve things I needed to update the WebRole element in the ServiceDefinitions.csdef file so that enableNativeCodeExecution is enabled.</p>
<blockquote><p>&lt;WebRole name="TwitterGravatarMVC" enableNativeCodeExecution="true"&gt;</p></blockquote>
<p>I found <a href="http://social.msdn.microsoft.com/Forums/en-US/netservices/thread/c2e49731-9e72-49b6-9fb3-1243c85b265d">the solution</a>, detailed above, on the<a href="http://social.msdn.microsoft.com/Forums/en-US/netservices/thread/c2e49731-9e72-49b6-9fb3-1243c85b265d"> Azure Services Platform Developer Centre forum</a>.</p>

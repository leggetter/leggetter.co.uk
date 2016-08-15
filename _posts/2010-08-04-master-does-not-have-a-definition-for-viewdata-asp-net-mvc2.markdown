---
layout: post
status: publish
published: true
title: Master does not have a definition for ViewData (ASP.NET MVC2)
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
wordpress_id: 1126
wordpress_url: "https://www.leggetter.co.uk/?p=1126"
date: "2010-08-04 12:05:28 +0100"
date_gmt: "2010-08-04 11:05:28 +0100"
categories:
  - Technology
tags:
  - Microsoft
  - ASP.NET MVC
  - ASP.NET
permalink: /2010/08/04/master-does-not-have-a-definition-for-viewdata-asp-net-mvc2.html
---

<p>I'm building an ASP.NET MVC2 web application and I was trying to access ViewData in my Site.Master page and I kept getting "master does not have a definition for ViewData".</p>
<p>[code lang="xml"]&lt;%= ViewData[&quot;topic&quot;] %&gt;[/code]</p>
<p>The simple answer was that my Master Page was not an ASP.NET MVC2 master page. Somehow I had a standard master page.</p>
<p>So, all I did was swap the existing page declaration</p>
<p>[code lang="xml"]&lt;%@ Master Language=&quot;C#&quot; AutoEventWireup=&quot;true&quot; CodeBehind=&quot;Site.Master.cs&quot; Inherits=&quot;HubSubscriber.Views.Shared.Site&quot; %&gt;[/code]</p>
<p>With an ASP.NET MVC2 declaration:</p>
<p>[code lang="xml"]&lt;%@ Master Language=&quot;C#&quot; Inherits=&quot;System.Web.Mvc.ViewMasterPage&quot; %&gt;[/code]</p>
<p>And bingo! ViewData was now accessible from my master page.</p>
<p>This post on <a href="http://www.asp.net/mvc/tutorials/passing-data-to-view-master-pages-cs">Passing Data to View Master Pages</a> may also be useful.</p>

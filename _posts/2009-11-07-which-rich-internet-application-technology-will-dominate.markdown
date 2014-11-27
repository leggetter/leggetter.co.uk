---
layout: post
status: publish
published: true
title: Which Rich Internet Application Technology will dominate?
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "I've been a member of the\_<a href=\"http://www.linkedin.com/groups?home=&amp;gid=112239&amp;trk=anet_ug_hm\">RIA Developers Group</a> on LinkedIn for a short while now and the other day <a href=\"http://ca.linkedin.com/in/patrickbay\">Patrick Bay</a> posted a link to an interesting <a href=\"http://www.computerweekly.com/Articles/2009/11/04/238406/rich-internet-applications-come-to-the-fore.htm\">article on Computer Weekly</a> about the prominence of RIAs. A few comments were posted and then Patrick questioned which RIAs would \"bubble to the top\".\r\n<blockquote>I think the UI revolution's already here; now we see which ones bubble to the top!</blockquote>\r\nThis got me thinking about the criteria that may determine which RIA technology would be most successful.\r\n\r\nI think there are a number of things that will determine which one will ultimately win, or at least become the dominant choice. At the moment I can think of three categories; <a href=\"http://www.leggetter.co.uk/2009/11/07which-rich-internet-application-technology-will-dominate.html#technology-buy-in\">Technology buy-in</a>, <a href=\"http://www.leggetter.co.uk/2009/11/07which-rich-internet-application-technology-will-dominate.html#development-environment\">Development environment</a> and <a href=\"http://www.leggetter.co.uk/2009/11/07which-rich-internet-application-technology-will-dominate.html#data-access-capabilities-and-choice\">Data access capabilities and choice</a>.\r\n"
wordpress_id: 534
wordpress_url: "http://www.leggetter.co.uk/?p=534"
date: "2009-11-07 01:34:29 +0000"
date_gmt: "2009-11-07 01:34:29 +0000"
categories:
  - Technology
tags:
  - JavaScript
  - silverlight
  - PHP
  - real-time web
  - real-time data
  - flash
  - RIA
  - Flex
  - Ajax
permalink: /2009/11/07/which-rich-internet-application-technology-will-dominate.html
---

<p>I've been a member of the <a href="http://www.linkedin.com/groups?home=&amp;gid=112239&amp;trk=anet_ug_hm">RIA Developers Group</a> on LinkedIn for a short while now and the other day <a href="http://ca.linkedin.com/in/patrickbay">Patrick Bay</a> posted a link to an interesting <a href="http://www.computerweekly.com/Articles/2009/11/04/238406/rich-internet-applications-come-to-the-fore.htm">article on Computer Weekly</a> about the prominence of RIAs. A few comments were posted and then Patrick questioned which RIAs would "bubble to the top".</p>
<blockquote><p>I think the UI revolution's already here; now we see which ones bubble to the top!</p></blockquote>
<p>This got me thinking about the criteria that may determine which RIA technology would be most successful.</p>
<p>I think there are a number of things that will determine which one will ultimately win, or at least become the dominant choice. At the moment I can think of three categories; <a href="/2009/11/07which-rich-internet-application-technology-will-dominate.html#technology-buy-in">Technology buy-in</a>, <a href="/2009/11/07which-rich-internet-application-technology-will-dominate.html#development-environment">Development environment</a> and <a href="/2009/11/07which-rich-internet-application-technology-will-dominate.html#data-access-capabilities-and-choice">Data access capabilities and choice</a>.<br />
<a id="more"></a><a id="more-534"></a><br />
<a name="technology-buy-in"></a></p>
<h2>Technology buy-in</h2>
<p>Some companies buy-in to a technology because they have always used that technology. For example, a company that have always used Java will be more likely to opt for the Adobe solution where they can write their server components using Java and their client in Flash/ActionScript/<a href="http://www.adobe.com/products/flex/">Flex</a> (<em>this terminology is still a bit unclear to me. I think this is why Adobe are renaming Flex Builder to Flash Builder</em>) but a company that have traditionally used Microsoft products will undoubtedly go for <a href="http://silverlight.net/">Silverlight</a>. More traditional web developers, who probably build upon the <a href="http://en.wikipedia.org/wiki/LAMP_(solution_stack)">LAMP stack</a>, that have been hand coding PHP on the server and JavaScript on the client tend to go for creating RIAs using Ajax.<br />
<a name="development-environment"></a></p>
<h2>Development environment</h2>
<p>I believe that Microsoft have a massive advantage in having <a href="http://www.microsoft.com/visualstudio/en-gb/products/professional/default.mspx">Visual Studio</a> as a server and client IDE. It has it's faults but in general it's a fantastic development environment. Those choosing Flex (Java -&gt; ActionScript/Flash) will more than likely choose the <a href="http://www.eclipse.org/">Eclipse IDE</a>, which is powerful, but it's ActionScript/Flex development tools are lacking maturity. I've recently used the <a href="http://labs.adobe.com/technologies/flashbuilder4/">Flash Builder 4 beta</a> and it's miles behind Visual Studio in terms of coding productivity features. I've heard that the Flex UI component development features may be better than Visual Studio's support for Silverlight UI. The LAMP with Ajax stack suffers much the same problems as Flex with, as far as I know, Eclipse being the IDE of choice and client-side productivity tools still very much in their infancy. It's clearly very difficult to write an IDE to enhance JavaScript/Ajax productivity.</p>
<div class="information">I quite frequently develop JavaScript in Eclipse using the <a href="http://www.aptana.org/">Aptana</a> plugin so I'd be interested in getting suggestions on other Ajax IDE choices.</div>
<p><a name="data-access-capabilities-and-choice"></a></p>
<h2>Data access capabilities and choice</h2>
<p>I think this has been one of the last things to be considered in the RIA stack. Previously browsers have locked down where you can get your data from. Developers were always trying to implement hacks to allow them to do things such as make a web request to a server on a different domain or <a href="http://en.wikipedia.org/wiki/Cross-site_scripting">cross-site scripting</a> to implement <a href="http://ajaxpatterns.org/HTTP_Streaming">HTTP streaming</a>. As the web has opened up to the idea of <a href="http://en.wikipedia.org/wiki/Mashup_(web_application_hybrid)">Mashups</a>, browser and RIA plugin vendors have had to change their stance on cross site security. It's a difficult line to walk but I believe that the technology that makes retrieving data from multiple sources the easiest, without having to go via a proxy, will have a distinct advantage. Flash and Silverlight are winning the race at the moment with Silverlight's use of <a href="http://msdn.microsoft.com/en-us/library/cc645032(VS.95).aspx">security policy files</a> and Flash's support for <a href="http://help.adobe.com/en_US/ActionScript/3.0_ProgrammingAS3/WS5b3ccc516d4fbf351e63e3d118a9b90204-7e08.html#WS366737CC-0BD3-47b4-8292-569FB3AA276B">master policy files</a>. For the Ajax solution I still need to research information on <a href="https://developer.mozilla.org/en/HTTP_access_control">HTTP cross domain access control</a> headers and which browsers have implemented support for them. I still think there will be an argument for mashing up your data on the server and I have a blog post planned on <a href="/2009/10/29/real-time-rich-internet-applications-rtria.html">RTRIA</a> server technologies.</p>
<p>The important questions around RIA data are:</p>
<ul>
<li>Which RIA will be more efficient at consuming data?</li>
<li>Which one will prove to be the most capable as a <a href="/2009/10/29/real-time-rich-internet-applications-rtria.html">Real-Time Rich Internet Application (RTRIA)</a>?</li>
<li>Will RIA technology vendors try to lock developers into using a client-server technology stack, such as Adobe may be trying to do with <a href="http://www.adobe.com/products/livecycle/dataservices/">LCDS</a> and Flex, and will this put developers off?</li>
<li>Is decoupling of server and client technology, and communication protocol, important? I think it is, do you?</li>
</ul>
<p>Although RIAs have been around for a while now, as Patrick said, the race to dominate the Rich Internet Application Technology space is on.</p>

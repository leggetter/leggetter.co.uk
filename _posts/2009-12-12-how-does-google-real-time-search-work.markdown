---
layout: post
status: publish
published: true
title: How does Google Real-Time Search work?
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "On or around the 12th of December 2009 Google released a feature they are calling \"real-time search\".\r\n<blockquote cite=\"http://googleblog.blogspot.com/2009/12/relevance-meets-real-time-web.html\">Our real-time search enables you to discover breaking news the moment it's happening, even if it's not the popular news of the day, and even if you didn't know about it beforehand.</blockquote>\r\nAlthough I'd still argue that we're not seeing the real-time web with this solution I thought I'd go in to a bit of detail about how Google are\_achieving\_this HTTP polling solution.\r\n\r\n<h2>Summary</h2>\r\n<ul>\r\n<li>Google are consuming and indexing real-time data from multiple social networks</li>\r\n<li>It's not real-time HTTP PUSH yet, it's HTTP PULL using a polling interval</li>\r\n<li>The polling interval seems to vary but this needs to be confirmed.</li>\r\n<li>The polling result returns an encoded JSON response containing the next request to be made and the HTML of any new results. These results are injected into the \"Latest results\" section of the page</li>\r\n<li>The HTML returned is quite verbose and could be refined</li>\r\n<li>87% from a sample of 30 polled requests returned no new results meaning the request was a waste of resources</li>\r\n</ul>\r\n"
wordpress_id: 600
wordpress_url: "http://www.leggetter.co.uk/?p=600"
date: "2009-12-12 14:18:20 +0000"
date_gmt: "2009-12-12 14:18:20 +0000"
categories:
  - Technology
tags:
  - JavaScript
  - real-time web
  - Google
  - real-time
  - Ajax
  - Le Web
permalink: /2009/12/12/how-does-google-real-time-search-work.html
---

<p>On or around the 12th of December 2009 Google released a feature they are calling "real-time search".</p>
<blockquote cite="http://googleblog.blogspot.com/2009/12/relevance-meets-real-time-web.html"><p>Our real-time search enables you to discover breaking news the moment it's happening, even if it's not the popular news of the day, and even if you didn't know about it beforehand.</p></blockquote>
<p>Although I'd still argue that we're not seeing the real-time web with this solution I thought I'd go in to a bit of detail about how Google are achieving this HTTP polling solution.</p>
<h2>Summary</h2>
<ul>
<li>Google are consuming and indexing real-time data from multiple social networks</li>
<li>It's not real-time HTTP PUSH yet, it's HTTP PULL using a polling interval</li>
<li>The polling interval seems to vary but this needs to be confirmed.</li>
<li>The polling result returns an encoded JSON response containing the next request to be made and the HTML of any new results. These results are injected into the "Latest results" section of the page</li>
<li>The HTML returned is quite verbose and could be refined</li>
<li>87% from a sample of 30 polled requests returned no new results meaning the request was a waste of resources</li>
</ul>
<p><a id="more"></a><a id="more-600"></a></p>
<h2>Data Sources</h2>
<p>Google now has an agreement in place with Twitter, Facebook, MySpace, FriendFeed, Identi.ca and Jaiku to consume and index their real-time data and make the results available in a "Latest Results" section of the Google search results. A number of social networks have APIs and some of these APIs have a real-time streaming feed and it's likely that Google is simply connecting to this. For example, MySpace have <a href="http://developer.myspace.com/Community/blogs/devteam/archive/2009/12/08/opening-the-flood-gates-and-unleashing-the-data.aspx">released a Real-Time Stream API</a> and Twitter has a Firehose feed, both of which Google will be using in their real-time search results. The Twitter Firehose feed is <a href="http://apiwiki.twitter.com/FAQ#CanIhavetheFirehose">"not generally available"</a> at the moment but Ryan Sarver, who is Director of Platform at Twitter, <a href="http://www.ustream.tv/recorded/2748326">announced at Le Web</a> that the Firehose stream would become generally available in the future.<br />
[caption align="alignnone" caption="Ryan Sarver, Director of Platform at Twitter, at Le Web"]<br />
<object id="utv142723" classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" width="480" height="386" codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,40,0"><param name="name" value="utv_n_321380" /><param name="flashvars" value="loc=%2F&amp;autoplay=false&amp;vid=2748326" /><param name="allowfullscreen" value="true" /><param name="allowscriptaccess" value="always" /><param name="src" value="http://www.ustream.tv/flash/video/2748326" /><embed id="utv142723" type="application/x-shockwave-flash" width="480" height="386" src="http://www.ustream.tv/flash/video/2748326" allowscriptaccess="always" allowfullscreen="true" flashvars="loc=%2F&amp;autoplay=false&amp;vid=2748326" name="utv_n_321380"></embed></object><br />
[/caption]</p>
<h2>How Google put the real-time data into their search results?</h2>
<p>Since Google now have access to the data as soon as it is generated by the social network the next thing they need to do is get that into your search results. As soon as you make your search Google can put information that has just become available straight into the page. However, how do they get information that becomes available after your search results page has already loaded? Simple. They poll for new results regular intervals (as I mentioned in my <a href="/2009/12/09/how-real-time-does-real-time-have-to-be.html">How real-time does real-time have to be?</a> blog post). So far I've seen a 20 second polling interval but recently, with a <a href="http://www.google.co.uk/search?q=%23leweb">search for #leweb</a>, I've seen a 30 second polling interval. It's possible that they may have an idea how likely it is that your search subject will have new information available and change this polling interval accordingly.</p>
<p>These polling search requests look like this:</p>
<pre>
http://www.google.co.uk/realtimejs?q=%23leweb
&hl=en
&polltype=mb
&since=1260622409000000
&sessionstart=1260623982000000
&ei=bpgjS5zOG8j54Ab5kMzpCQ
&usg=05e5
</pre>
<p>And the responses:<br />
[code lang="js"]<br />
mbrt0.insert('{\x22nextRequest\x22:\x22/realtimejs?q\\x3d%23leweb\\x26hl\\x3den\\x26output\\x3dsearch\\x26since\\x3d1260623734161591\\x26sessionstart\\x3d1260623385000000\\x26ei\\x3dbpgjS5zOG8j54Ab5kMzpCQ\\x26usg\\x3d3760\x22,\x22results\x22:[{\x22date\x22:\x221260623734161590\x22,\x22html\x22:\x22\\x3cli class\\x3d\\x22g s\\x22 style\\x3d\\x22line-height:16px;margin:0 0 8px;overflow:hidden\\x22\\x3e\\x3ctable class\\x3d\\x22ts\\x22\\x3e\\x3ctr\\x3e\\x3ctd colspan\\x3d3 class\\x3drt2 style\\x3d\\x22overflow:none\\x22\\x3e\\x3cdiv class\\x3drt1 style\\x3d\\x22background-position:-4px 0;width:6px;height:4px;float:right\\x22\\x3e\\x3c/div\\x3e\\x3cdiv class\\x3drt1 style\\x3d\\x22width:4px;height:4px\\x22\\x3e\\x3c/div\\x3e\\x3ctr\\x3e\\x3ctd class\\x3drt1 style\\x3d\\x22background-position:-10px 0;background-repeat:repeat\\x22\\x3e\\x3cdiv style\\x3d\\x22width:2px\\x22\\x3e\\x3c/div\\x3e\\x3ctd style\\x3d\\x22padding:0 5px 1px;width:100%\\x22\\x3eFinally back at home after a long week in Paris. Great time at \\x3ca href\\x3d\\x22/search?q\\x3d%23LeWeb+site%3Atwitter.com\\x26amp;tbs\\x3dmbl:1\\x26amp;tbo\\x3d1\\x26amp;hl\\x3den\\x26amp;output\\x3dsearch\\x26amp;ei\\x3dcZgjS8PMNZbSjAfnl_nYBw\\x26amp;sa\\x3dX\\x26amp;oi\\x3dmicroblog_result\\x26amp;resnum\\x3d1\\x26amp;ct\\x3dresult\\x26amp;cd\\x3d1\\x26amp;ved\\x3d0CAMQoAQoADAA\\x22\\x3e#\\x3cem\\x3eLeWeb\\x3c/em\\x3e\\x3c/a\\x3e. Reconnected with lots of old friends etc,\\x3ctd class\\x3drt1 style\\x3d\\x22background-position:-14px 0;background-repeat:repeat\\x22\\x3e\\x3cdiv style\\x3d\\x22width:3px\\x22\\x3e\\x3c/div\\x3e\\x3ctr\\x3e\\x3ctd colspan\\x3d3 class\\x3drt2 style\\x3d\\x22background-position:-4px\\x22\\x3e\\x3cdiv class\\x3drt1 style\\x3d\\x22background-position:-4px -4px;width:6px;height:6px;float:right\\x22\\x3e\\x3c/div\\x3e\\x3cdiv class\\x3drt1 style\\x3d\\x22background-position:0 -4px;width:4px;height:6px\\x22\\x3e\\x3c/div\\x3e\\x3c/table\\x3e\\x3cdiv class\\x3drt1 style\\x3d\\x22background-position:-17px 0;margin-top:-3px;margin-left:5px;padding:4px 0 0 23px\\x22\\x3e\\x3cspan class\\x3dgl\\x3e\\x3ca href\\x3d\\x22http://twitter.com/bdesarnauts\\x22 class\\x3dl onmousedown\\x3d\\x22return clk(this.href,\\x27microblog_result\\x27,\\x27\\x27,\\x27result\\x27,\\x271\\x27,\\x27\\x27,\\x270CAIQoAQwAA\\x27)\\x22\\x3ebdesarnauts\\x3c/a\\x3e\\x3c/span\\x3e - \\x3cspan class\\x3da\\x3etwitter.com\\x3c/span\\x3e - \\x3ca href\\x3d\\x22/url?q\\x3dhttp://twitter.com/bdesarnauts/status/6598672912\\x26amp;ei\\x3dcZgjS8PMNZbSjAfnl_nYBw\\x26amp;sa\\x3dX\\x26amp;oi\\x3dmicroblog_result\\x26amp;resnum\\x3d1\\x26amp;ct\\x3dresult\\x26amp;cd\\x3d2\\x26amp;ved\\x3d0CAQQoAQoADAA\\x26amp;usg\\x3dAFQjCNEyjEaOrJexPm6wUgqqVEDg24BOFQ\\x22 style\\x3d\\x22text-decoration:none\\x22\\x3e\\x3cspan class\\x3d\\x22f rtdm\\x22\\x3e4 minutes ago\\x3c/span\\x3e\\x3c/a\\x3e\\x3c/div\\x3e\x22}]}');<br />
[/code]<br />
The response is an encoded JSON response and contains two things:</p>
<ul>
<li><strong>nextRequest</strong>: The next polling search request to make</li>
<li><strong>results</strong>: An Array of Encoded HTML for any results that have been found for the current polling request.</li>
</ul>
<p>In the example response above we get a next request of:<br />
[code]<br />
/realtimejs?<br />
q\\x3d%23leweb\\x26hl\\x3den\\x26output\\x3dsearch\\x26since\\x3d1260623734161591\\x26sessionstart\\x3d1260623385000000\\x26ei\\x3dbpgjS5zOG8j54Ab5kMzpCQ\\x26usg\\x3d3760<br />
[/code]<br />
Which translates to the following URL:</p>
<pre>
http://www.google.co.uk/realtimejs?q=%23leweb&hl=en&output=search&since=1260623734161591&sessionstart=1260623385000000&ei=bpgjS5zOG8j54Ab5kMzpCQ&usg=3760
</pre>
<p>From looking at the parameters it would appear that the <strong>since</strong> parameter would be very useful and would allow you to retrieve historical updates.</p>
<p>Each encoded HTML result in the results array will be decoded on the client using JavaScript and injected into the "Latest Results" section within the search result listings. It's quite surprising that they return quite so much encoded HTML content and not just the information and then generate the HTML on the client. I suppose this is a new feature and it will be refined over time.</p>
<p>One point worth mentioning is that because Google are using a polling technique they are performing a lot of HTTP PULL requests to the server that return no results. This is a wasted request. From a sample size of 30 polled requests only 4 requests actually returned new results. This means that 87% of requests are a complete waste of resources.</p>

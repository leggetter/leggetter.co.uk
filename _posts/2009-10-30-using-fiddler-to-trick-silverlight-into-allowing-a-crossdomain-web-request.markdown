---
layout: post
status: publish
published: true
title: Using Fiddler to trick Silverlight into allowing a crossdomain Web Request
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
excerpt: "If you are trying to make a web request from a Silverlight application the first thing the Silverlight runtime will do is request a security policy file (see <a href=\"http://msdn.microsoft.com/en-us/library/cc645032(VS.95).aspx\">Network Security Access Restrictions in Silverlight</a>) from the root of the server you are making your web request to. This happens if you are making your request using the <a href=\"http://msdn.microsoft.com/en-us/library/system.net.httpwebrequest(VS.95).aspx\">HttpWebRequest</a> or <a href=\"http://msdn.microsoft.com/en-us/library/system.net.webclient(VS.95).aspx\">WebClient</a> class. If the Silverlight runtime fails to get a security policy file your web request will fail. If your Silverlight application relies on this web request then you are going to need to contact the server owner and get them to add a security file but until then you can use the <a href=\"http://www.fiddler2.com/fiddler2/\">Fiddler HTTP Proxy</a> to trick the Silverlight runtime into believing that it does have permission to make the request.\r\n"
wordpress_id: 425
wordpress_url: "https://www.leggetter.co.uk/?p=425"
date: "2009-10-30 11:06:06 +0000"
date_gmt: "2009-10-30 11:06:06 +0000"
categories:
  - Technology
tags:
  - silverlight
  - Microsoft
  - real-time web
  - RTRIA
  - real-time data
  - real-time
permalink: /2009/10/30/using-fiddler-to-trick-silverlight-into-allowing-a-crossdomain-web-request.html
---

<p>If you are trying to make a web request from a Silverlight application the first thing the Silverlight runtime will do is request a security policy file (see <a href="http://msdn.microsoft.com/en-us/library/cc645032(VS.95).aspx">Network Security Access Restrictions in Silverlight</a>) from the root of the server you are making your web request to. This happens if you are making your request using the <a href="http://msdn.microsoft.com/en-us/library/system.net.httpwebrequest(VS.95).aspx">HttpWebRequest</a> or <a href="http://msdn.microsoft.com/en-us/library/system.net.webclient(VS.95).aspx">WebClient</a> class. If the Silverlight runtime fails to get a security policy file your web request will fail. If your Silverlight application relies on this web request then you are going to need to contact the server owner and get them to add a security file but until then you can use the <a href="http://www.fiddler2.com/fiddler2/">Fiddler HTTP Proxy</a> to trick the Silverlight runtime into believing that it does have permission to make the request.<br />
<a id="more"></a><a id="more-425"></a><br />
<small>If you want to skip the explanation you can jump <a href="#screencast">straight to the screencast</a></small></p>
<h2>How Silverlight makes a web request</h2>
<p>If you were making a web request from Silverlight to download the following page:</p>
<p><code>https://www.leggetter.co.uk/2009/10/23/how-i-approach-problem-solving-in-code.html</code></p>
<p>The Silverlight runtime would first request</p>
<p><code>https://www.leggetter.co.uk/clientaccesspolicy.xml</code></p>
<p>If this request fails it will then request</p>
<p><code>https://www.leggetter.co.uk/crossdomain.xml</code></p>
<p>If both of these requests fail (return a 404 HTTP status) the Silverlight runtime will not allow you to make your web request. *</p>
<p><small>* Note: The web request failure due to a failure to download a security policy file can manifest itself in a number of ways. I'll try to remember to put a post up about this later.</small></p>
<p>The clientaccesspolicy.xml file is Microsoft's own security policy file. The crossdomain.xml file is used by Adobe Flash but is also supported by Silverlight. For more information see <a href="http://help.adobe.com/en_US/ActionScript/3.0_ProgrammingAS3/WS5b3ccc516d4fbf351e63e3d118a9b90204-7e08.html#WS366737CC-0BD3-47b4-8292-569FB3AA276B">master-policy file</a>.</p>
<p>Now that we've got the background information out of the way we can get on to the interesting stuff.</p>
<h2>An example using the Twitter Streaming Feed</h2>
<p>If you wanted to write your own <a href="/2009/10/29/real-time-rich-internet-applications-rtria.html">Real-Time Rich Internet Application (RTRIA)</a> that consumed data from the <a href="http://apiwiki.twitter.com/Streaming-API-Documentation">Twitter real-time data stream</a> you'd be stuck. Well, you'll be stuck until Twitter puts a security policy file up **. Until then you can trick the Silverlight runtime by using <a href="http://www.fiddler2.com/fiddler2/">Fiddler</a> to detect the security policy file request and fake a response.</p>
<p><small>**  The following URLs are where Twitter would put their security policy files should they decide to allow cross domain access. Please not that you'll be prompted for your Twitter username and password if you click on them by the browser because you need to sign in with valid twitter credentials to access the twitter <em>stream</em> domain: http://stream.twitter.com/clientaccesspolicy.xml and http://stream.twitter.com/crossdomain.xml)</small></p>
<p>To do this you will need to set up an <a href="http://www.fiddler2.com/Fiddler2/help/AutoResponder.asp">AutoResponder</a> in Fiddler that intercepts the request for the security policy file by the Silverlight runtime and returns a fake security policy file. In the example below I have an AutoResponder set up for <code>http://stream.twitter.com/crossdomain.xml</code>.</p>
<p>[caption id="attachment_426" align="alignnone" width="300" caption="Using Fiddler to AutoRespond with a fake Security Policy File"]<a title="Using Fiddler to AutoRespond with a fake Security Policy File " href="/wp-content/uploads/2009/10/UsingFiddlerToAutoRespondWithAFakeSecurityPolicyFile.png"><img class="size-medium wp-image-426 " title="UsingFiddlerToAutoRespondWithAFakeSecurityPolicyFile" src="/wp-content/uploads/2009/10/UsingFiddlerToAutoRespondWithAFakeSecurityPolicyFile-300x195.png" alt="Using Fiddler to AutoRespond with a fake Security Policy File" width="300" height="195" /></a>[/caption]</p>
<p>Here's an example of a crossdomain.xml security policy file which grants access to requests from all domains.</p>
<pre>&lt;?xml version="1.0"?&gt;
&lt;!DOCTYPE cross-domain-policy
  SYSTEM "http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd"&gt;
&lt;cross-domain-policy&gt;
  &lt;allow-access-from domain="*" /&gt;
&lt;/cross-domain-policy&gt;</pre>
<p>Once you've set up the AutoResponder start Fiddler. Then start your Silverlight application that is trying to stream data from Twitter and bingo! You should have real-time data from Twitter in your RIA - a Real-Time Rich Internet Application (RTRIA).</p>
<p><a name="screencast"></a></p>
<h2>Fiddler HTTP Proxy Screencast</h2>
<p><object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" width="425" height="344" codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,40,0"><param name="allowFullScreen" value="true" /><param name="allowScriptAccess" value="always" /><param name="src" value="http://www.youtube.com/v/NXSmH9aWxeo&amp;color1=0xb1b1b1&amp;color2=0xcfcfcf&amp;hl=en&amp;feature=player_embedded&amp;fs=1" /><param name="allowfullscreen" value="true" /><embed type="application/x-shockwave-flash" width="425" height="344" src="http://www.youtube.com/v/NXSmH9aWxeo&amp;color1=0xb1b1b1&amp;color2=0xcfcfcf&amp;hl=en&amp;feature=player_embedded&amp;fs=1" allowscriptaccess="always" allowfullscreen="true"></embed></object></p>

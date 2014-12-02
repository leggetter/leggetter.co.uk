---
layout: post
status: publish
published: true
title: Defining the Kwwika API
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 773
wordpress_url: "http://www.leggetter.co.uk/?p=773"
date: "2010-04-02 12:34:48 +0100"
date_gmt: "2010-04-02 11:34:48 +0100"
categories:
  - Technology
  - Real-Time Web Musings
tags:
  - JavaScript
  - real-time web
  - real-time data
  - Kwwika
  - API
  - Design
permalink: /2010/04/02/defining-the-kwwika-api.html
---

<p><strong>Update: Hang on a minute. You've not explained what <em>Kwwika</em> is!</strong><br />
In a really <a href="http://nur.ph/ih7pgw">informative chat using Nurph</a>, which has been really useful in getting feedback, it was pointed out to me by <a href="http://nur.ph/users/rythie">@rythie</a> and <a href="http://nur.ph/users/neilcauldwell">@NeilCauldwell</a> that I need to explain what problem Kwwika is trying to solve before asking what the API should look like.</p>

<h2>Why do we need Kwwika?</h2>
<p>There are loads of real-time technologies available at the moment. Almost all of them have a reasonable learning curve and require a developer to sort out server infrastructure, perform installation, do all sort of configuration and then finally get around to writing an application. In the same way that a lot of developers or organisations have moved into managed hosting for their websites, or more recently moved a lot of their IT infrastructure into the Cloud, Kwwika offers a managed and scalable real-time infrastructure so you can concentrate on building your <a href="/2009/10/29/real-time-rich-internet-applications-rtria.html">Real-Time Rich Internet Application</a>.</p>
<p>The way I'm describing Kwwika at the moment is:</p>
<blockquote><p>Kwwika is a real-time web data sharing platform with APIs in JavaScript, Silveright, .NET, Java and C.</p></blockquote>
<h3>An example of where Kwwika could be used</h3>
<p><a href="http://blog.caplin.com/author/martintcaplincom/">Martin Tyler</a> recently wrote a <a href="http://blog.caplin.com/2010/02/24/when-were-you-when-tendulkar-scored-200/">blog post</a> that provides a great example of where a service like Kwwika would have been really useful. In the situation described in the blog post <a href="http://www.cricinfo.com/">CricInfo</a> could simply publish their cricket updates to their defined topic in Kwwika, maybe <em>/CRICINFO/GAMES/INDIA-SOUTHAFRICA/</em>, from a single server. They would then add a small piece of script to their game web page that subscribes to this topic and updates that web page whenever any new data is available. Users would see the real-time in-page updates and would no longer continue to hit "Refresh" to see if the score had updated. Kwwika would instead take the hit of the data transfer and push the live updates to the web page. This would take a massive load off of the CricInfo server and clearly save them a lot of time and infrastructure costs.</p>
<h2>How will I use Kwwika?</h2>
<p>When we launch Kwwika all you'll need to do to use the service is:</p>
<ol>
<li>Register for Kwwika via a sign up page</li>
<li>Define your topics that you would like to publish data to in the Kwwika dashboard e.g. <em>/PhilLeggetter/Kwwika</em></li>
<li>Find some topics with information on that you are interested in using e.g. <em>/BBC/NEWS/SPORT/FOOTBALL</em> (doesn't exist - just an example - but how cool would that be!)</li>
<li>Embed the Kwwika &lt;script&gt; tag in your web application or download the API for your chosen technology</li>
<li>Start developing your Real-Time Rich Internet Application</li>
</ol>
<ul></ul>
<p>I think the great thing about this is that developers just use the Kwwika service and only ever need to care about developing their own application. Kwwika provides the server infrastructure so you don't have to.</p>
<h2>The Kwwika API</h2>
<p>I'm in the middle of defining the Kwwika API and thought this would be a great opportunity to get some early feedback. We plan to have initial releases of the API for the following technologies:</p>
<ul>
<li>JavaScript</li>
<li>Java</li>
<li>.NET</li>
<li>Silverlight</li>
<li>C</li>
</ul>
<p>The API is really simple. It has the following functionality:</p>
<ul>
<li>Connect</li>
<li>Receive connection events</li>
<li>Subscribe for data</li>
<li>Receive subscription events such as errors and data updates</li>
<li>Publish data</li>
<li>Receive data publishing events (publish success or failure)</li>
<li>Disconnect</li>
</ul>
<p>At the moment we have two ways of thinking about the API. The following two examples are using the JavaScript API but we plan to make the APIs virtually identical between technologies with the only differences down to following the language specific standards.<br />
<a id="more"></a><a id="more-773"></a><br />
Our main topic of discussion is around how you initiate your connection to the Kwwika service but for completeness I'll provide full examples. The first option we have is to create a <code>Connection</code> object using a factory method on the <code>kwwika</code> namespace.</p>
<p>[javascript]<br />
var oConnection = kwwika.connect({<br />
									&quot;connectionStatusUpdated&quot;:function(sStatus)<br />
									{<br />
										document.getElementById(&quot;connectionStatus&quot;).innerHTML = sStatus;<br />
									}<br />
								 });</p>
<p>var oSubscription =<br />
	oConnection.subscribe(&quot;/KWWIKA/LIBRARIES/JavaScriptAPI&quot;,<br />
						  {<br />
						  	&quot;topicUpdated&quot;:function(oSubscription, mUpdate)<br />
						  	{<br />
						  		for(var sFieldName in mUpdate)<br />
						  		{<br />
						  			document.getElementById(&quot;field_&quot; + sFieldName).innerHTML = mUpdate[sFieldName];<br />
						  		}<br />
						  	},<br />
						  	&quot;topicError&quot;:function(oSubscription, sReason)<br />
						  	{<br />
						  		var sMsg = oSubscription.topicName + &quot; error: &quot; + sReason;<br />
						  		document.getElementById(&quot;topicErrorMessage&quot;).innerHTML = sMsg;<br />
						  	});</p>
<p>oConnection.publish(&quot;/KWWIKA/LIBRARIES/JavaScriptAPI&quot;,<br />
					{<br />
						&quot;name&quot;: &quot;Phil Leggetter&quot;,<br />
						&quot;status&quot;: &quot;Getting feedback about the Kwwika API&quot;,<br />
						&quot;datetime&quot;: new Date().getTime()<br />
					},<br />
					{<br />
						&quot;commandSuccess&quot;:function(oSubscription)<br />
						{<br />
							var sMsg = oSubscription.topicName + &quot; message published.&quot;;<br />
						  	document.getElementById(&quot;publishStatus&quot;).innerHTML = sMsg;<br />
						},<br />
						&quot;commandError&quot;:function(oSubscription, sError)<br />
						{<br />
							var sMsg = oSubscription.topicName + &quot; publish error: &quot; + sError;<br />
						  	document.getElementById(&quot;publishStatus&quot;).innerHTML = sMsg;<br />
						}<br />
					});<br />
[/javascript]</p>
<p>In the second option is to create a new <code>Kwwika</code> object.</p>
<p>[javascript]<br />
var oKwwika = new Kwwika({<br />
							&quot;connectionStatusUpdated&quot;:function(sStatus)<br />
							{<br />
								document.getElementById(&quot;connectionStatus&quot;).innerHTML = sStatus;<br />
							}<br />
						 });</p>
<p>var oSubscription =<br />
	oKwwika.subscribe(&quot;/KWWIKA/LIBRARIES/JavaScriptAPI&quot;,<br />
					  {<br />
					  	&quot;topicUpdated&quot;:function(oSubscription, mUpdate)<br />
					  	{<br />
					  		for(var sFieldName in mUpdate)<br />
					  		{<br />
					  			document.getElementById(&quot;field_&quot; + sFieldName).innerHTML = mUpdate[sFieldName];<br />
					  		}<br />
					  	},<br />
					  	&quot;topicError&quot;:function(oSubscription, sReason)<br />
					  	{<br />
					  		var sMsg = oSubscription.topicName + &quot; error: &quot; + sReason;<br />
					  		document.getElementById(&quot;topicErrorMessage&quot;).innerHTML = sMsg;<br />
					  	});</p>
<p>oKwwika.publish(&quot;/KWWIKA/LIBRARIES/JavaScriptAPI&quot;,<br />
				{<br />
					&quot;name&quot;: &quot;Phil Leggetter&quot;,<br />
					&quot;status&quot;: &quot;Getting feedback about the Kwwika API&quot;,<br />
					&quot;datetime&quot;: new Date().getTime()<br />
				},<br />
				{<br />
					&quot;commandSuccess&quot;:function(oSubscription)<br />
					{<br />
						var sMsg = oSubscription.topicName + &quot; message published.&quot;;<br />
					  	document.getElementById(&quot;publishStatus&quot;).innerHTML = sMsg;<br />
					},<br />
					&quot;commandError&quot;:function(oSubscription, sError)<br />
					{<br />
						var sMsg = oSubscription.topicName + &quot; publish error: &quot; + sError;<br />
					  	document.getElementById(&quot;publishStatus&quot;).innerHTML = sMsg;<br />
					}<br />
				});<br />
[/javascript]</p>
<p>Do the above examples make sense? Is the API easy enough to use? How would you establish a connection to the Kwwika service? Would you do anything differently?</p>
<p>I'd love to get you feedback so please leave your comments below or email me directly using <a href="mailto:phil@leggetter.co.uk?subject=Defining the Kwwika API">phil@leggetter.co.uk</a>.</p>

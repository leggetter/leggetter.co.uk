---
layout: post
status: publish
published: true
title: What is the “real-time web”?
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "Are we really seeing the real-time web? The phrase &ldquo;real-time web&rdquo; has been streaming its way around the Internet for a while now. It&rsquo;s presently being used to describe information being available in search results as soon as it has been published by its author. Examples of this are Twitter..."
wordpress_id: 1416
wordpress_url: "http://blog.caplin.com/?p=89"
date: "2009-04-20 11:00:54 +0100"
date_gmt: "2009-04-20 11:00:54 +0100"
categories: []
tags:
  - web 2.0
  - real-time web
  - comet
  - Ajax
permalink: "http://blog.caplin.com/2009/04/20/what-is-the-real-time-web/"
---

<h2><strong>Are we really seeing the real-time web?</strong></h2>
<p>The phrase &#8220;<em>real-time web</em>&#8221; has been streaming its way around the Internet for a while now. It&#8217;s presently being used to describe information being available in search results as soon as it has been published by its author. Examples of this are Twitter or FriendFeed search.</p>
<p>As far as I&#8217;m aware it was Robert Scoble who made this phrase mainstream. Here&#8217;s an example from the start of February, but by this time Robert had been using the term for a while and a quick Google finds the <a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3d3dy5yZWFkd3JpdGV3ZWIuY29tL2FyY2hpdmVzL2dvb2dsZV9maW5hbmNlX2FuZF90aGVfcmVhbF90aW1lX3dlYi5waHA=">term used</a> as early as June 2008:</p>
<blockquote><p>Let&#8217;s do a search for anyone who has written about the Canon 5D MK II but lets constrain that to posts that have at least one like and at least four comments. <a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL2ZyaWVuZGZlZWQuY29tL3NlYXJjaD9xPUNhbm9uKzVEK01LK0lJJmFtcDtpbnRpdGxlPSZhbXA7aW5jb21tZW50PSZhbXA7c2VydmljZT0mYW1wO2Zyb209JmFtcDtyb29tPSZhbXA7Y29tbWVudD0mYW1wO2xpa2U9JmFtcDtjb21tZW50cz00JmFtcDtsaWtlcz0x">Here&#8217;s the search</a>. Note that the post I wrote just one minute ago is already in the results page. This is the real-time web. &#8211; Robert Scoble (<a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3Njb2JsZWl6ZXIuY29tLzIwMDkvMDIvMDkvaXMtdGhlLXJlYWwtdGltZS13ZWItYS10aHJlYXQtdG8tZ29vZ2xlLXNlYXJjaC8=">http://scobleizer.com/2009/02/09/is-the-real-time-web-a-threat-to-google-search/</a>)</p>
</blockquote>
<p>Whilst this is an example of something being almost instantly available from search does it really qualify as being &#8220;real-time&#8221;?</p>
<p><span id="more-89"></span><br />
The first thing to do, as others have done, is understand what the term &#8220;real-time&#8221; means. Rather than going into this I recommend you have a read of the wikipedia definition of <a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9SZWFsLXRpbWU=">real-time</a> and watch a Kaazing presentation on <a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3d3dzIuc3lzLWNvbi5jb20vd2ViaW5hcmFyY2hpdmUuY2ZtP3NraXA9b24mYW1wO3BpZD13Y19hdzhlX2QyX3M0X3QxX2thYXppbmcmYW1wO3JlZ2lkPTMzOTA0">What is the Real-Time Web</a>. There have been fewer attempts at defining &#8220;real-time web&#8221;. Even Wikipedia presently (19/04/2009) lacks a definition.</p>
<p>For me for something to be real-time web it should meet the following criteria:</p>
<ol>
<li>Get up to the second information on a chosen subject.</li>
<li>Make an initial request for information to be delivered across the Internet. Subsequent updates to that information, or information stream, should be delivered as soon as possible without the need to make a additional requests.</li>
<li>Initial information and subsequent updates should be delivered in an acceptable amount of time.</li>
</ol>
<h2>The real-time web experience</h2>
<p>If I go to <a  0="title="Phil" 1="Leggetter" 2="on" 3="Twitter"" href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3R3aXR0ZXIuY29tL2xlZ2dldHRlcg==">my twitter homepage</a> I don&#8217;t want to have to refresh the page, by clicking the refresh button, or hitting the F5 key, in order to see new messages from the people that I&#8217;m following. Twitter doesn&#8217;t really want users doing this either as it puts load on their server &#8211; but let&#8217;s leave this for another time.</p>
<div class="wp-caption alignnone" style="width: 220px"><a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3R3aXR0ZXIuY29t"><img title="Twitter" src="http://assets0.twitter.com/images/twitter.png" alt="" width="210" height="49" /></a>
<p class="wp-caption-text">Twitter</p>
</div>
<p>This lack of real-time updates on the Twitter site has lead to a surge in Twitter client applications such as <a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3d3dy50d2VldGRlY2suY29tLw==">TweetDeck</a> and <a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3d3dy50d2hpcmwub3JnLw==">Thwirl</a>. These clients simulate real-time by polling the <a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL2FwaXdpa2kudHdpdHRlci5jb20v">Twitter API</a> at intervals. I&#8217;d like to highlight the word &#8220;<em>simulate</em>&#8221; again and clarify what polling is. What the Twitter client applications are actually doing is making requests to Twitter at periodic intervals to see if the user has had any messages and if they have it displays them, if there are no new messages then it&#8217;s a wasted request.</p>
<div class="wp-caption alignleft" style="width: 290px">
<div style="background-color:black"><img class="alignnone size-full wp-image-548" title="tweetdeck_logo" src="http://blog.caplin.com/wp-content/uploads/tweetdeck_logo.png" alt="tweetdeck_logo" width="251" height="50" /></div>
<p>
<p class="wp-caption-text">TweetDeck</p>
</div>
<div class="wp-caption alignleft" style="width: 290px"><a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3d3dy50d2hpcmwub3JnLw=="><img title="Twhirl" src="http://www.twhirl.org/themes/twhirl/logo.jpg" alt="Twhirl" width="220" height="105" /></a>
<p class="wp-caption-text">Twhirl</p>
</div>
<p>A much better model would be for Twitter to notify the client that new messages are available by passing the additional messages straight to the Twitter client.</p>
<h2>Real-time web delivery time</h2>
<p>What determines the amount of time that is acceptable between a message being published and it being received by the consumer (user) depends on the context of its use. For something such as instant messaging or a Twitter conversation the time between publication and consumption can be reasonably large, maybe 10 seconds. However, if the publisher is a trading system sending a price and the consumer is a trader 10 seconds is far too long. By the time the price reaches the trader it may be out of date.</p>
<h2>Real-time technology</h2>
<p><a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3htcHAub3JnLw==">XMPP</a> and <a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL3NpbXBsZXVwZGF0ZXByb3RvY29sLw==">SUP</a> have been touted as the technology to deliver the real-time web but they appear to be server side solutions or require clients with knowledge of the specific technologies. For a web solution people start to turn to Comet server solutions. Caplin Systems &#8211; the real-time web company &#8211; have had the technology available to deliver real-time data for many years now so I wanted to understand why, only now, has the idea of a &#8220;real-time web&#8221; really taken off.</p>
<div class="wp-caption alignnone" style="width: 220px"><img alt="Caplin Systems" src="http://www.caplin.com/assets/templates/caplin/img/logo.gif" title="Caplin Systems" width="210" height="37" />
<p class="wp-caption-text">Caplin Systems</p>
</div>
<p>Caplin Systems have a high performance scalable <a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3d3dy5jYXBsaW4uY29tL2NhcGxpbnBsYXRmb3JtLz9jdXJhcnRfaWQ9MzY=">real-time comet server called Liberator</a> that can push updates to subscribing clients as soon as it receives information. The clients are:</p>
<ul type="disc">
<li>Java      clients: standalone application or applet</li>
<li>.NET      clients such a windows desktop application or web page embedded      SilverLight widget</li>
<li>JavaScript      clients: any website such as <a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3R3aXR0ZXIuY29tLw==">http://twitter.com</a> or <a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL2ZyaWVuZGZlZWQuY29tLw==">http://friendfeed.com</a></li>
</ul>
<p>Twitter and FriendFeed don&#8217;t use Liberator but they could easily do so. All that needs to be done to integrate <em>Real-time Rich Internet Application</em> (<em>RTRIA</em> ?) functionality to an existing web site is include a JavaScript library called <a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3d3dy5mcmVlbGliZXJhdG9yLmNvbS9kb2N1bWVudGF0aW9uL3NsNGIvaW50cm9kdWN0aW9uLmh0bWw=">SL4B (StreamLink for Browsers)</a>. The <em>RTRIA</em> functionality can then be added to an existing site in the same way that RIA functionality can be introduced to a website using other JavaScript libraries such as <a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL2pxdWVyeS5jb20v">JQuery</a>. However, in this case the <em>RIA</em> functionality that can be added is a true real-time web experience of data being pushed to the client as soon as it becomes available, without any need for the user to check to see if any new information is available.</p>
<h2>Conclusion</h2>
<p>My opinion is that the instant availability of information via search straight after it&#8217;s published doesn&#8217;t really justify the term &#8220;real-time web&#8221;. To be truely real-time the information needs to be pushed to the user. The true real-time web experience and the technology to achieve this is already here but at the moment few people are aware of it and therefore it&#8217;s not in mainstream use. The ideas behind Comet, the Liberator server and Liberator clients provide technology and infrastructure to push data to clients without the need for polling or a user driven information request. Scalability and side by side integration with existing systems are already possible which means there&#8217;s no reason why existing clients such as websites can&#8217;t start taking advantage of it.</p>
<p>Some relevant links:</p>
<ul style="text-align: left;">
<li><a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3d3dy5yZWFkd3JpdGV3ZWIuY29tL2FyY2hpdmVzL3NvcnJ5X2dvb2dsZV95b3VfbWlzc2VkX3RoZV9yZWFsX3RpbWVfd2ViLnBocA==">http://www.readwriteweb.com/archives/sorry_google_you_missed_the_real_time_web.php</a></li>
<li><a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3d3dy5nbmlwY2VudHJhbC5jb20v">http://www.gnipcentral.com/</a></li>
<li><a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3Njb2JsZWl6ZXIuY29tLzIwMDkvMDIvMDkvaXMtdGhlLXJlYWwtdGltZS13ZWItYS10aHJlYXQtdG8tZ29vZ2xlLXNlYXJjaC8=">http://scobleizer.com/2009/02/09/is-the-real-time-web-a-threat-to-google-search/</a></li>
<li><a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3Njb2JsZWl6ZXIuY29tLzIwMDgvMTIvMjEvcnNzLXNob3dzLWl0cy1hZ2UtaW4tcmVhbC10aW1lLXdlYi1zdXAtYW5kLXhtcHAtdG8tdGhlLXJlc2N1ZS8=">http://scobleizer.com/2008/12/21/rss-shows-its-age-in-real-time-web-sup-and-xmpp-to-the-rescue/</a></li>
<li>Kaazing presentation on &#8220;<a  href="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?url=aHR0cDovL3d3dzIuc3lzLWNvbi5jb20vd2ViaW5hcmFyY2hpdmUuY2ZtP3NraXA9b24mYW1wO3BpZD13Y19hdzhlX2QyX3M0X3QxX2thYXppbmcmYW1wO3JlZ2lkPTMzOTA0">What is real-time web</a>&#8220;</li>
</ul>
<p> <img src="http://blog.caplin.com/wp-content/plugins/wordpress-feed-statistics/feed-statistics.php?view=1&post_id=89" width="1" height="1" style="display: none;" /></p>

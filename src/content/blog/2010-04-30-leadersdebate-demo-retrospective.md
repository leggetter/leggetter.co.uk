---
layout: post
status: publish
published: true
title: "#LeadersDebate demo retrospective"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
excerpt: "        \r\n\tFollowing on from the first #LeadersDebate demo blog post we thought it would be good to look back on how we built the demo, how it performed on the two debate evenings and determine what worked and what did not.\r\n\_\r\nWe'd hoped to be able to ..."
wordpress_id: 825
wordpress_url: "http://blog.kwwika.com/leadersdebate-demo-retrospective"
date: "2010-04-30 15:42:00 +0100"
date_gmt: "2010-04-30 14:42:00 +0100"
categories:
  - Technology
tags:
  - real-time web
  - Kwwika
permalink: "http://blog.kwwika.com/leadersdebate-demo-retrospective"
---

<p>Following on from the <a href="http://blog.kwwika.com/how-did-we-build-that-leadersdebate-demo">first #LeadersDebate demo blog post</a> we thought it would be good to look back on how we built the demo, how it performed on the two debate evenings and determine what worked and what did not.</p>
<p>We'd hoped to be able to do more to improve the performance of <a href="http://kwwika.com/Demos/TwitterRealTimeVisualisation/LeadersDebate">the #LeadersDebate demo</a> between the second and final debate but time constraints mean we only just managed to make one improvement. This improvement was to remove the retweets (RT) from the demo. This meant that the tweet mention count better reflected unique tweets and the amount of data being pushed through the Kwwika service, and more importantly, to each web browser viewing the demo.<br />
 <br />
The latter is where the demo really fell down on each of the debate evenings. During the one and a half hour event last night around 120,000 tweets were made containing the tag #LeadersDebate. This means that on average there were over 1,300 tweets per minute and over 20 tweets per second.<br />
 <a id="more"></a><a id="more-825"></a><br />
<span style="font-size: large;">How much data?</span></p>
<p />
The amount of data that we are talking about probably isn't too much data for a web page to handle until you drill into the contents of the data and look at what is being done on the web page itself.<br />
 <br />
Only a small amount of the tweet data being sent to the browser was actually being displayed. Here's a sample message:<br />
 <br />
<a href='http://posterous.com/getfile/files.posterous.com/kwwika/RH8qHbax35229AVtku7ukOPW6acn9TQOH0D0L0s7NnCd2TMdTkbQTiCMUAbO/Firebug_mUpdate.png.scaled.1000.jpg'><img src="http://posterous.com/getfile/files.posterous.com/kwwika/RN5jpMsKedxkIoCLF7ND7V1FIspvy55jUBiAZDUi4SmFJCRJuzn2qLu2um3V/Firebug_mUpdate.png.scaled.500.jpg" width="500" height="179"/></a></p>
<p> <br />
In the case of the #LeadersDebate demo we only really needed ScreenName, Text, UserProfileImageUrl, TotalTweets and sometimes the reply based fields. If we had only sent through the data we actually needed this would have made a small, but useful, dent in the amount of data the web browser would need to process.<br />
 <br />
<span style="font-size: large;">What did we do with the data?</span></p>
<p />
<strong>Calculations</strong></p>
<p />
Once we had received the data we did a few calculations. We worked out the total number of tweets received for all the leaders together. So, TotalTweets could be 136,690,  BrownTweets 31,020, CameronTweets 38,313 and CleggTweets 28,704. So, the total leader tweets would be 98,037 (31,020 + 38,313 + 28,704).<br />
 <br />
<a href='http://posterous.com/getfile/files.posterous.com/kwwika/ker3ziIybYyH4lU5YYx0oFK3HnOz8yW3ZKH8EAyDwr6DDObVKmcX5i4Nk2Ax/LeadersDebateTotals.png'><img src="http://posterous.com/getfile/files.posterous.com/kwwika/nTliIiJ1cUarDI7jxWKoW7WNkpF5AIOauajkkMxjhs55pHScg1IGPitgSJIq/LeadersDebateTotals.png.scaled.500.jpg" width="500" height="103"/></a></p>
<p> <br />
On top of this we also converted these figures into percentages. Brown on 32% (31,020 / 98,037), Cameron on 39% (38,313 / 98,037) and Clegg on (28,704 / 98,037).<br />
 <br />
<a href='http://posterous.com/getfile/files.posterous.com/kwwika/B7qwYN3kJPu5OJdklIB6AdDWoAgXUlMTe5VO8JMBwjEGMOEJld7hL9lR50zY/leadersPercentage.png'><img src="http://posterous.com/getfile/files.posterous.com/kwwika/yQBiCAin9W96oGefzlnZizoNKuEHS3Ih3t9zCmfSy4gZVKa3I5a1yjg1cA3Y/leadersPercentage.png.scaled.500.jpg" width="500" height="126"/></a></p>
<p>Although these are simple and small calculations they were performed each time there was a tweet update; 20 times a second.<br />
 <br />
<strong>Filtering</strong><br />
 <br />
Since we were receiving all #LeadersDebate updates but we wanted to make sure that each tweet was analysed to ensure that it went into the appropriate leaders' column. So, as each tweet came in we would perform a textual match on the tweet message (mUpdate.Text). This was done once per column for each tweet and there were also multiple filters to check against e.g. for David Cameron we filtered on David, Cameron, DC, Dave, Tories, Tory, Conservatives and a few others.<br />
 <br />
We also added the ability to live filter the far left column. We did this using some <a href="http://api.jquery.com/category/selectors/">jQuery selectors</a> and if you'd have tried this as the debate was happening it is more than likely that your browser crashed.<br />
 <br />
The main thing to learn here is it's still much better to do intensive work such as this in the Kwwika.NET application that is consuming all the data in real-time from the Twitter Streaming API. We were publishing all #leaderdebate tweets on the /KWWIKA/TWITTER/HASHTAGS/LEADERSDEBATE topic when instead we should have published things on different topics to allow the web browser client to concentrate on just displaying the data. Maybe having a few topics like this would have worked:</p>
<ul>
<li>Tweet Counts and statistics: <em>/KWWIKA/TWITTER/HASHTAGS/LEADERSDEBATE/COUNTS</em> </li>
<li>Brown Tweets: <em>/KWWIKA/TWITTER/HASHTAGS/LEADERSDEBATE/BROWN</em> </li>
<li>Cameron Tweets: <em>/KWWIKA/TWITTER/HASHTAGS/LEADERSDEBATE/CAMERON</em> </li>
<li>Clegg Tweets: <em>/KWWIKA/TWITTER/HASHTAGS/LEADERSDEBATE/CLEGG</em> </li>
<li>Tweets that didn't mention any leader but still contained #LeadersDebate: <em>/KWWIKA/TWITTER/HASHTAGS/LEADERSDEBATE/OTHER</em> </li>
</ul>
<p>Using this all count and percentage calculations could have been done within the Kwwika.NET application, which was running on a web server, and pushed to the /<em>COUNTS </em>topic, all tweets about specific or multiple leaders could have gone to the appropriate leader topic, /<em>BROWN</em>, /<em>CAMERON</em>, /<em>CLEGG</em> and all others to /<em>OTHER</em>. The Brown column would display all /BROWN tweets, the Cameron column all /CAMERON tweets, the Clegg column all /<em>CLEGG </em>tweets and the all column would combine /<em>OTHER</em>, /<em>BROWN</em>, /<em>CAMERON</em> and /<em>CLEGG</em>.<br />
 <br />
It's potentially a bit more complex this way, since the Kwwika.NET API application has to analyse tweets and publish them to different topics, but it certainly take all strain off of the client.<br />
 <br />
<span style="font-size: large;">How was the data displayed?</span></p>
<p />
As mentioned in the <a href="http://blog.kwwika.com/how-did-we-build-that-leadersdebate-demo">first #LeadersDebate blog post</a> we decided upon four columns. One for each leader and one to display all the tweets. The columns were formed from a Kwwika Twitter Widget that we've built and we enhanced it to allow us to make it a bit more configurable. You can see the widget standalone on the <a href="http://kwwika.com/About">About Kwwika</a> page. We also decided to use two <a href="http://code.google.com/apis/visualization/documentation/gallery.html">Google interactive charts</a> to provide a visual representation of the data as it arrived in real-time.<br />
 <br />
One of the enhancements we added to the Kwwika Twitter widget was to add some <a href="http://api.jquery.com/category/effects/">jQuery effects</a> to allow the tweets to <a href="http://api.jquery.com/slideDown/">slide down</a> into view. At low update rates this is a really nice effect. At higher update rates your browser is unlikely to cope.<br />
 <br />
The charting components are also a really nice effect at lower update rates but as soon as the update rates increase they don't really cope.<br />
 <br />
<span style="font-size: large;">Bug!</span></p>
<p />
Yep, we admit it. There was a bug in our code. If you viewed the demo and things appeared to be working fine for you but then you stopped getting updates you've probably been bitten. We'll fix this in our core library very soon.<br />
 </p>
<p><span style="font-size: large;">What did we prove?</span><br />
 <br />
We've proven that our Kwwika technology is clearly the bees knee's. We had absolutely no problems within the Kwwika service or within our Kwwika.NET application. We also think that the JavaScript Kwwika API held our well with the exception of the bug we've found.<br />
 <br />
The main thing for us is that it was very clear during the 20+ tweets per second period that there was no way that any human being could actually read the tweets. The statistics were very interesting so maybe the demo should have concerntrated on that rather than the individual tweets. If we'd have done this and done the tweet analysis in the Kwwika.NET application running on a server then the web browser would have had absolutely no problem at all dealing with the update rate.<br />
 <br />
<span style="font-size: large;">Browsers</span><br />
 <br />
It's potentially a little unfair to suggest a best browser since our bug mean using some other browsers was pretty tricky. However, for us, Chrome seemed to stand up to the update rate and seemed to work around the bug far better than Firefox or Internet Explorer.<br />
 <br />
<span style="font-size: large;">Conclusion</span><br />
 <br />
By considering the following we would certainly be able to improve the #LeadersDebate performance and user experience:</p>
<ol>
<li>Do a little calculating and analysis in the client as possible when you are dealing with high volume data.</li>
<li>Organise the data so that the client doesn't have to.</li>
<li>Only send that data that is needed to the web browser. Don't send unused fields.</li>
<li>Consider the update rate. If the target consumer is a human being will they be able to read the data?</li>
<li>At high data rates visual effects and charting components don't seem to work in a web browser. For charting consider pulsing the data or only making an update at set intervals.</li>
<li>We could certainly dig even deeper into the causes of the browser slow down by using tools to analyse bottle necks and potential areas for memory leaks within the browser.</li>
</ol>
<p> <br />
<span style="font-size: large;">We'll give you the code</span></p>
<p />
<p>
We built this as a demo. It's not a product. So, if you would like to build something similar and want a starting point we are happy to have a chat and give you the code. So, <a href="http://kwwika.com/Contact">get in touch</a>.</p>
<p><a href="http://blog.kwwika.com/leadersdebate-demo-retrospective">Permalink</a> </p>
<p>	| <a href="http://blog.kwwika.com/leadersdebate-demo-retrospective#comment">Leave a comment&nbsp;&nbsp;&raquo;</a></p>

---
layout: post
status: publish
published: true
title: Kwwika Powered Real-Time Opta Sports Cricket Widget
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
excerpt: "        \r\n\tOver the past couple of weeks we've been involved in developing a Real-Time Cricket widget. It's been a collaboration, with Opta Sports providing the data, Kwwika powering the real-time client push as well as doing a bit of dev on data archi..."
wordpress_id: 3712
wordpress_url: "http://blog.kwwika.com/kwwika-powered-real-time-opta-sports-cricket"
date: "2010-12-17 01:54:00 +0000"
date_gmt: "2010-12-17 01:54:00 +0000"
categories:
  - Technology
tags:
  - JavaScript
  - real-time web
  - real-time data
  - Kwwika
  - Opta Sports
  - cricket
  - widget
  - Matador Digital
permalink: "http://blog.kwwika.com/kwwika-powered-real-time-opta-sports-cricket"
---

<p>Over the past couple of weeks we've been involved in developing a Real-Time Cricket widget. It's been a collaboration, with <a href="http://www.optasports.com/">Opta Sports</a> providing the data, Kwwika powering the real-time client push as well as doing a bit of dev on data architecture and feed parsing and <a href="http://www.matadorgroup.co.uk/">Matador Digital</a> helping us build the widget itself.</p>
<div id="ashes_3rd_test"></div>
<p><script src="http://kwwika-cdn.s3.amazonaws.com/widgets/opta/cricket/opta.cricket.js"></script><br />
<script><br />
opta.cricket.widget("#ashes_3rd_test",<br />
    {<br />
        style:"scorecard",<br />
        gameDirectory:"/opta/cricket/fixtures/icc_world_cup_2011/20110330/semi_final_2"<br />
    }<br />
);<br />
</script></p>
<style>
.opta-kwwika-score { color: white; }.opta-kwwika-news p { margin-top: 10px; }<br />
</style>
<p>There's quite a bit of work gone into this widget in a short space of time and I'm really pleased with the result. I'll go into exactly how it was built in more detail in a later post but for now i'll focus on what the widget can do and be used in this post.</p>
<h2>Features</h2>
<p>Opta Sports have created a an <a href="http://www.optasports.com/sports/cricket/internet-and-mobile/live-scores-centre.html">overview page for the widget</a> which details the features at a higher level but I'm going to drill down a little bit deeper into the tech and explain how easily the widget can be embedded on any website.</p>
<h3>Real-time ball-by-ball updates</h3>
<p>For each event that occurs within a cricket match Opta Sports generate a feed. We get this feed, parse it and push it through Kwwika and into the web page. This means that every event is displayed on the widget.</p>
<h3>Show either full scoreboard or simple match status</h3>
<p>Ok, we finally get to see how you embed the widget in your page. It's simple!</p>
<p>[code lang="js"]opta.cricket.widget(&quot;#scorecard-wrapper&quot;,<br />
    {<br />
        style:&quot;scorecard&quot;,<br />
        gameDirectory:&quot;/OPTA/CRICKET/FIXTURES/AUSTRALIA_V_ENGLAND_ASHES_2010-11/20101226/4TH_TEST&quot;<br />
    }<br />
);[/code]</p>
<p>The first parameter you pass to the <em>opta.cricket.widget</em> function is a <a href="http://api.jquery.com/category/selectors/">jQuery selector</a>. This tells the widget where it should be created. If the selector matches multiple elements then you'll get multiple widgets. You probably wouldn't want this but it's a cool trick. The widget will replace the contents of the selected element(s) so until the widget loads you can have some HTML that says the widget is loading or just some static cricket data. If the widget can't load for any reason then the contents of the element(s) won't be replaced. This won't happen though ;)</p>
<p>The second parameter is options for the widget. We have a number of options that we support but the example above shows:</p>
<ul>
<li><strong>style</strong>: The widget can be created in a number of forms and this option parameter indicates how the widget should be displayed:
<ul style="margin-left: 40px;">
<li><strong>scorecard:</strong> This style is the full scorecard for an innings. This displays an overview section and all batsman and bowler information.</li>
<li><strong>mini</strong>: This style is very similar to the scorecard. It displays the overview section and just the batsman and bowlers that are active.</li>
<li><strong>overview</strong>: This style shows just the overview section of the widget.</li>
<li><strong>livescores</strong>: This style just shows the current score in a smaller widget area.</li>
</ul>
</li>
<li><strong>gameDirectory</strong>: This identifies the Kwwika topic to request for the game and the data for this game will be displayed in the widget. The following topic is used for the 3rd test of the Australia v England Ashes 2010 to 2011 series: /OPTA/CRICKET/FIXTURES/AUSTRALIA_V_ENGLAND_ASHES_2010-11/20101216/3RD_TEST</li>
</ul>
<p><a href="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/fqabufgjhfeIiblgbDuhmdutxwnhhIpEyxkcEkDAnihxxGqezBscnbcmDssz/overview_green.png.scaled1000.png"  rel="opta-style-examples"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/fqabufgjhfeIiblgbDuhmdutxwnhhIpEyxkcEkDAnihxxGqezBscnbcmDssz/overview_green.png.scaled500.png" alt="" width="500" height="143" /></a><br />
<a href="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/AaIGbcAzCqtttqnwAxcaiziksaEeEqBltzrpjGgoGwbCJcfuzevuyBBtCget/mini_green.png.scaled1000.png"rel="opta-style-examples"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/AaIGbcAzCqtttqnwAxcaiziksaEeEqBltzrpjGgoGwbCJcfuzevuyBBtCget/mini_green.png.scaled500.png" alt="" width="500" height="336" /></a><br />
<img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/JIEGhhBxpDDhlmBJlJoAEtfyIixuEFiCkjGfsvBogGDcvelwguabhwzdtJga/livescore_green.png.scaled500.png" alt="" width="283" height="205" /><br />
<a href="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/ussuJCHuyjacpcBexmqJqzxAhGvmffbsCfnloGbqxldJeICcIsicEakJdvms/OptaCricketWidget-Scorecard.png.scaled1000.png" rel="opta-style-examples"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/ussuJCHuyjacpcBexmqJqzxAhGvmffbsCfnloGbqxldJeICcIsicEakJdvms/OptaCricketWidget-Scorecard.png.scaled500.png" alt="" width="500" height="571" /></a></p>
<p><a href="http://blog.kwwika.com/kwwika-powered-real-time-opta-sports-cricket">See and download the full gallery on posterous</a></p>
<p>We also have a few other option parameters:</p>
<ul>
<li><strong>innings</strong>: The widget defaults to displaying the latest available information. However, we cache some of the cricket data so it's possible to display the data for an earlier innings from a match by passing in an innings number.</li>
<li><strong>flashTime</strong>: When an update occurs such as a run being scored or a bowler bowling a batsman out we flash the widget. This allows you to set how long the flash will last for.</li>
<li><strong>title</strong>: This is displayed at the top of the widget if it is in the livescores style.</li>
<li><strong>topicErrorMsg</strong>: A bit techie. If you have entered a gameDirectory that doesn't exist then the widget displays an error message. This allows you to configure what that error message says. It can contain HTML.</li>
</ul>
<h3>Developed using Kwwika technology for instant data streaming</h3>
<p>Yep, it's the real-time web. Delivered ;) Do you have any data that you want to instantly distribute to any web-enabled device? If so, <a href="http://kwwika.com/contact">get in touch</a>.</p>
<h3>Easy to customise - apply your own styling and branding</h3>
<p>Since the widget is purely HTML and we've styled it with CSS you can easily customise the widget. <a href="http://twitter.com/aaronbassett">Aaron Basset</a> of Matador Digital did a great job when I asked him to supply a few different stylesheets. He told me that he'd used <a href="http://lesscss.org/">LESS</a> to generate the CSS for the widget so it was easy to create different styles. Within 15 minutes Aaron had sent 10 different styles my way. You can apply the different styles in our example pages by just changing the drop-down at the top-left of the page. My favourites are the Kill Bill or Comic styles.</p>
<p><a href="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/bpuxDEEHedsauwFcpltclDdbahcqbuhABjetFqtekCzoysvtgbqlAwsGyhws/comic.png.scaled1000.png"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/bpuxDEEHedsauwFcpltclDdbahcqbuhABjetFqtekCzoysvtgbqlAwsGyhws/comic.png.scaled500.png" alt="" width="500" height="523" /></a><br />
<a href="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/qelyocjonkyDzsrcryweiwbsAaiIekFcyHIvCmbIvlhDDBhBqtGJtDClnHud/killbill.png.scaled1000.png"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/qelyocjonkyDzsrcryweiwbsAaiIekFcyHIvCmbIvlhDDBhBqtGJtDClnHud/killbill.png.scaled500.png" alt="" width="500" height="524" /></a><br />
<img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/IlpkhpAxwGvkDFCletdFAmhgviIznymklIcfqvxJByohDfEpkqsEGvsfsBzH/livescore_green.png.scaled500.png" alt="" width="283" height="205" /><br />
<img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/wqoiBBxAiEpJGcAbvziCedumtoadHietpzzgGwsbobCdAIJvjxlnHapFljFJ/livescore_orange.png.scaled500.png" alt="" width="279" height="198" /><br />
<a href="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/paIuDDDyiyBaFJEmCtaFvwsAikHhyHIDyGnzwnzmhzFarptatbrjlhEqmAGH/mini_blue.png.scaled1000.png"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/paIuDDDyiyBaFJEmCtaFvwsAikHhyHIDyGnzwnzmhzFarptatbrjlhEqmAGH/mini_blue.png.scaled500.png" alt="" width="500" height="331" /></a><br />
<a href="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/wkxjgCrczoDohsJdIsBwkpJnidegFrHdJBjBJpkJtghGrtaejEDFEdglreCd/mini_green.png.scaled1000.png"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/wkxjgCrczoDohsJdIsBwkpJnidegFrHdJBjBJpkJtghGrtaejEDFEdglreCd/mini_green.png.scaled500.png" alt="" width="500" height="336" /></a><br />
<a href="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/kfHtxfsweExeurIpmcDdFnlwittrumwoJycyakEoxknGhIalqEIgixfDlydc/overview_bbcworld.png.scaled1000.png"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/kfHtxfsweExeurIpmcDdFnlwittrumwoJycyakEoxknGhIalqEIgixfDlydc/overview_bbcworld.png.scaled500.png" alt="" width="500" height="142" /></a><br />
<a href="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/ArAexJeyzwiBbAIGsyknimvhmmgajiwyoArnwblrBBlboGHhzcnDItFvCHhH/mini_mono.png.scaled1000.png"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/ArAexJeyzwiBbAIGsyknimvhmmgajiwyoArnwblrBBlboGHhzcnDItFvCHhH/mini_mono.png.scaled500.png" alt="" width="500" height="329" /></a><br />
<a href="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/tryiFlBvIlAHIogqEsAAxpqungcJBjIJoCAEtvmqBkdorviBkqDDgcJvAkwF/overview_terra.png.scaled1000.png"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/tryiFlBvIlAHIogqEsAAxpqungcJBjIJoCAEtvmqBkdorviBkqDDgcJvAkwF/overview_terra.png.scaled500.png" alt="" width="500" height="143" /></a><br />
<a href="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/hmDnBAGsJdzhtodmlDfvjkphEkojJhHGyhqfhHmkiznorEEhJAbjtdzCkbHH/purple.png.scaled1000.png"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/hmDnBAGsJdzhtodmlDfvjkphEkojJhHGyhqfhHmkiznorEEhJAbjtdzCkbHH/purple.png.scaled500.png" alt="" width="500" height="528" /></a><br />
<a href="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/jkCCnIDovIrHqgplumltIDFGuerfEkBGdrGkFgyvwDwicuBAcErIDDGoztyC/red.png.scaled1000.png"><img src="http://posterous.com/getfile/files.posterous.com/temp-2010-12-17/jkCCnIDovIrHqgplumltIDFGuerfEkBGdrGkFgyvwDwicuBAcErIDDGoztyC/red.png.scaled500.png" alt="" width="500" height="521" /></a></p>
<p><a href="http://blog.kwwika.com/kwwika-powered-real-time-opta-sports-cricket">See and download the full gallery on posterous</a></p>
<h3>Can be embedded anywhere within the website with just three lines of code</h3>
<p>We've classed the HTML container element for the widget and the single widget script include as lines of code which bumps this up to 3 lines. I've used a number of widgets in the past and I think we've done a great job here.</p>
<p>[code lang="html"]<br />
&lt;div id=&quot;scorecard&quot;&gt;&lt;/div&gt;<br />
&lt;script src=&quot;http://cdn.kwwika.com/widgets/opta/cricket/opta.cricket.js&quot;&gt;&lt;/script&gt;<br />
&lt;script&gt;opta.cricket.widget(&quot;#scorecard-wrapper&quot;, {style:&quot;mini&quot;, gameDirectory:&quot;/OPTA/CRICKET/FIXTURES/AUSTRALIA_V_ENGLAND_ASHES_2010-11/20101216/3RD_TEST&quot;});&lt;/script&gt;<br />
[/code]<br />
Okay, that last line is a bit long and maybe counts as 4!</p>
<h3>Multiple matches on a single web page</h3>
<p>You can call <em>opta.cricket.widget</em> as many times as you like and for each call you could pass a different game directory. That way you could easily have multiple games displayed on the same web page if you liked. You could also mix the styles of widgets that are on a web page.</p>
<p><a href="http://posterous.com/getfile/files.posterous.com/kwwika/tdvPG09HvkihLke9RWI2vTiDvFDnGfFUv8b0id1zl7RCZnhydwASztySV3zs/MixedWidgets.png.scaled.1000.jpg"><img src="http://posterous.com/getfile/files.posterous.com/kwwika/v84NgEWg0RAkrANR8v586ya1fFbq8fHmAEgNc4jgIgzhAzDkF48sFic98KPA/MixedWidgets.png.scaled.500.jpg" alt="" width="500" height="430" /></a></p>
<h2>I want that widget!</h2>
<p>Opta Sports specialise in high quality sports data. They have a number of sports products and this real-time cricket widget is the latest such product. Opta Sports are looking for companies who are interested in taking this widget and embedding it on their website or within their web application. If you are interested please <a href="http://kwwika.com/contact">get in touch with us</a> or or directly with Opta Sports <a href="http://www.optasports.com/sports/cricket/internet-and-mobile/live-scores-centre.html">via their cricket score centre page</a>.</p>
<p>Since the ashes are nearly at an end we will also consider allowing you to embed this widget free of charge on your website for the remaining Ashes matches. Just <a href="http://kwwika.com/contact">get in touch</a>.</p>
<h2>I want the cricket data!</h2>
<p>One of the things that excites us about this widget is that we are now seeing high quality sports data streaming through our servers. We've also proven that Kwwika is a fantastic distribution channel for real-time data. And we've seen that the delivery speeds between the data being captured and appearing on a web page are fantastic! We hope that this is the start of a big DAAS (Data as a Service) trend and that Kwwika can be at the forefront of it.</p>
<p>If you like the widgets but you'd love to just get hold of the raw data and build your own widget, web app, mobile app or desktop app then <a href="http://kwwika.com/contact">please get in touch</a> too.</p>
<h2>Examples</h2>
<p>You can find a link to all the the live examples on <a href="http://kwwika.com/Standalone/Demos/opta/cricket/ashes-widget/example.html">Opta Sports - Cricket Match &amp; Events Centre demo</a> page.</p>
<p>The above examples are hard-coded to show the Ashes 2nd Test but here are the Scorecard widget links to allow you to view the data from the 3rd and 4th tests:</p>
<ul>
<li>3rd Test: <a href="http://kwwika.com/Standalone/Demos/opta/cricket/ashes-widget/single-scorecard.html?game_dir=/OPTA/CRICKET/FIXTURES/AUSTRALIA_V_ENGLAND_ASHES_2010-11/20101216/3RD_TEST">http://kwwika.com/Standalone/Demos/opta/cricket/ashes-widget/single-scorecard.html?game_dir=/OPTA/CRICKET/FIXTURES/AUSTRALIA_V_ENGLAND_ASHES_2010-11/20101216/3RD_TEST</a></li>
<li>4th Test: <<a href="http://kwwika.com/Standalone/Demos/opta/cricket/ashes-widget/single-scorecard.html?game_dir=/OPTA/CRICKET/FIXTURES/AUSTRALIA_V_ENGLAND_ASHES_2010-11/20101226/4TH_TEST">/OPTA/CRICKET/FIXTURES/AUSTRALIA_V_ENGLAND_ASHES_2010-11/20101226/4TH_TEST</a></li>
<li>5th Test: <a href="http://kwwika.com/Standalone/Demos/opta/cricket/ashes-widget/single-scorecard.html?game_dir=/OPTA/CRICKET/FIXTURES/AUSTRALIA_V_ENGLAND_ASHES_2010-11/20110103/5TH_TEST">http://kwwika.com/Standalone/Demos/opta/cricket/ashes-widget/single-scorecard.html?game_dir=/OPTA/CRICKET/FIXTURES/AUSTRALIA_V_ENGLAND_ASHES_2010-11/20110103/5TH_TEST</a></li>
</ul>
<p>From the format of the above links I'm sure you'll be able to work out how to view the other examples with different games :)</p>
<p><strong><em>Additional</em></strong>: You can also see the <strong>South Africa v India</strong> test using this topic:</p>
<p>/OPTA/CRICKET/FIXTURES/SOUTH_AFRICA_V_INDIA_TEST_SERIES_2010-11/20101216/1ST_TEST</p>
<h2>Thanks</h2>
<p>Last but certainly not least, a bit thanks to everybody we worked with on this.</p>
<h3>Opta Sports</h3>
<p>A big thanks to <a href="http://optasports.com/">Opta Sports</a> for working on this product with us and giving us a chance to show off our technology. Working with <a href="http://twitter.com/#!/alonzehavi">Alon</a> in particular has been a pleasure.</p>
<h3>Matador Digital</h3>
<p>We'd also like to thank <a href="http://www.matadorgroup.co.uk/">Matador Digital</a> for the UI work and doing the majority of the widget functionality (I couldn't help "lending a hand" though). Dave did a great job helping us come up with the UI and Aaron never ceases to amaze me with little pieces of information that make daunting tasks seem so simple. Really appreciate your hard work guys!</p>
<p><a href="http://blog.kwwika.com/kwwika-powered-real-time-opta-sports-cricket">Permalink</a></p>
<p>| <a href="http://blog.kwwika.com/kwwika-powered-real-time-opta-sports-cricket#comment">Leave a comment  »</a></p>
<p><!-- digg verification --><br />
<span style="display:hidden">978d6a1bd7d647028d1d1f29d49cd10d</span></p>

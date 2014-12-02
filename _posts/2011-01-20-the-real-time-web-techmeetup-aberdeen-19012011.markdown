---
layout: post
status: publish
published: true
title: "The Real-Time Web: TechMeetup Aberdeen - 19/01/2011"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 5479
wordpress_url: "http://www.leggetter.co.uk/?p=5479"
date: "2011-01-20 12:51:26 +0000"
date_gmt: "2011-01-20 12:51:26 +0000"
categories:
  - Technology
tags:
  - real-time web
  - real-time data
  - pubsubhubbub
  - http streaming
  - websockets
  - TechMeetup
  - Aberdeen
  - real-time web services
  - real-time web platforms
permalink: /2011/01/20/the-real-time-web-techmeetup-aberdeen-19012011.html
---

<p>I did my first ever <a href="http://www.techmeetup.co.uk/">TechMeetup</a> talk yesterday in Aberdeen and my chosen subject, unsurprisingly, was <strong>The Real-Time Web</strong>. We started out discussing what real-time was, then what The Real-Time Web is and when receiving information in real-time mattered. I also went on to cover some of the key real-time web technologies including <strong>HTTP Streaming</strong>, <strong>PubSubHubbub</strong> and <strong>WebSockets</strong> and then on to <strong>real-time web services and platforms</strong>.</p>

<p>A big thanks to <a href="http://twitter.com/#!/aboynejames">@aboynejames</a> for suggesting I do the talk and <a href="http://www.abdn.ac.uk/~csc228/blog/">Bruce Scharlau</a> for inviting me along. I'd also like to thank everybody who attended and made me feel very welcome and certainly seemed interested.</p>
<h3>Feedback</h3>
<p>If you where there then please leave a comment letting me know what you thought or just to let me know who you are. If you'd rather email you can get me using <a href="mailto:phil@leggetter.co.uk?subject=Aberdeen TechMeetup">phil@leggetter.co.uk</a>.</p>
<h3>Video</h3>
<p>Here's a video of the first 10 minutes of the talk. Unfortunately the video recorder ran out of batteries.</p>
<div style="text-align:center;"><iframe src="http://player.vimeo.com/video/19060295" width="400" height="227" frameborder="0"></iframe>
<p><a href="http://vimeo.com/19060295">TM January 2011: Phil Leggetter - Real-Time Web</a> from <a href="http://vimeo.com/user2219054">Alan Gardner</a> on <a href="http://vimeo.com">Vimeo</a>.</p>
</div>
<h3>Presentation and Notes</h3>
<p><iframe src="https://docs.google.com/present/embed?id=dhf7xbgp_184gqqj6hhc&size=m" frameborder="0" width="555" height="451"></iframe></p>
<p>Unfortunately I can't find a way of showing my slide notes in the above embeded Google Presentation so here they are in pretty rough form.</p>
<h4>What is Real-Time?</h4>
<p>Respond or react within a predictable time after an event has occurred.</p>
<p>There may also be a maximum time constraint.</p>
<p>Because after that maximum time the information loses value and context.</p>
<p>Maybe we should really call it:<br />
Right-Time</p>
<h4>When does Real-Time matter?</h4>
<p><strong>When does NOW matter?</strong></p>
<p>When do you think being informed of something the instant it occurs really matters?</p>
<ul>
<li><strong>Critical systems</strong>. </li>
<li><strong>Live events</strong> where things lose context.</li>
<li>Systems requiring synchronisation:<br />
The 2Screen experience e.g. <a href="http://tellylinks.com">TellyLinks.com</a></li>
<li>Interactive/collaborative things e.g. chat, Google Wave, Google Docs (docs, spreadsheets, drawing)</li>
<li><b>Sensor data</b> e.g. Car ABS breaks</li>
<li><strong>Trading</strong>: You've got to be sure you are seeing the correct trade price in order to be able to make a decision on whether to trade or not.</li>
<li><strong>Betting</strong>: You want to make sure you bet at the right odds and you don't want clients to be able to bed when the odds have changed.</li>
</ul>
<h4>Evolution of the Web</h4>
<p><strong>From Pull to Push</strong></p>
<p>Although I'm going to use the Web Browser as the example client the client could of course be anything. Another web server any desktop application, a mobile application, an embedded app on any device.</p>
<p>I'm also going to focus on HTTP but the mechanisms could be applied to standard TCP socket connections.</p>
<h4>HTTP Pull (Request, Response)</h4>
<p>Note: client. This can be a web browser but doesn't have to be.</p>
<p>1) Each request would result in a page reload.<br />
2) Event occurs on server there's no way of the server telling the browser.<br />
3) e.g. chat pages where you would need to click the "Refresh" button to see what other users are saying </p>
<h4>HTTP Polling</h4>
<p>A user hitting F5 or clicking the refresh button is one manual example.</p>
<p>1) REFRESH-META<br />
2) Then frames<br />
3) XMLHttpRequest -> Outlook web access (ActiveX object) </p>
<p>Check if the information has changed by polling.</p>
<p>The problem with this is you can easily waste requests and it can be resource intensive for both the client and the server.</p>
<p>A large amount of services still take this approach although the web, and the technologies, have evolved to allow for real-time push.</p>
<p>For quite some time I've said if a service uses HTTP Polling when push technology is available and a much better option that <a href="http://itsnotrealtime.com">it's not real-time</a></p>
<h4>HTTP Push</h4>
<p>In this diagram you could replace the Client with Server. The initialization could be classed as a subscription or webhook.</p>
<p>Various techniques have been developed to hold a connection open to a web server from a browser.</p>
<p>Difficulties :</p>
<p>* Proxies/Firewall<br />
* Connection reselience<br />
* Browsers<br />
* Messaging API</p>

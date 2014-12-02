---
layout: post
status: publish
published: true
title: 10 Realtime Web Technology Predictions for 2014
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 24278
wordpress_url: "http://www.leggetter.co.uk/?p=24278"
date: "2014-02-24 08:54:30 +0000"
date_gmt: "2014-02-24 08:54:30 +0000"
categories:
  - Technology
tags:
  - realtime web
  - internet of things
  - predictions
  - IoT
  - WebRTC
  - RTCDataChannel
permalink: /2014/02/24/10-realtime-web-technology-predictions-for-2014.html
thumb: /images/thumb/icon_27467-300x300.png
---

<p>Nearly two months in, I thought I'd publish 10 realtime web technology predictions for 2014 based on how it developed in 2013 and the trends I've seen so far this year. I've added two additional <strong>bonus predictions</strong> for good measure.</p>

<p><em>Note: I came up with most of this list at the start of the year. I've only just got around to expanding upon the details now.</em></p>

<p>Before I go into the predictions: if you're interested in realtime technologies then you may be interested in the Realtime APIs panel that I'm putting together with <a href="https://twitter.com/kinlane">Kin Lane</a> as part of the <a href="http://www.apistrategyconference.com/2014Amsterdam/index.php">API Strategy Conference 2014 in Amsterdam</a>.</p>

<p><a name="all"></a></p>
<h2>1. Realtime All the Apps</h2>
<p><img src="/wp-content/uploads/2014/02/icon_18986-150x150.png" alt="icon_18986" width="150" height="150" class="alignright size-thumbnail wp-image-24284" /></p>

<p>We're seeing increased understanding of the benefits of realtime web tech so it's not surprising that the number of apps using the technology is rapidly increasing. Common functionality includes simple data updates for notifications, dashboards (sports, finance, site analytics and anything that's stat-heavy), realtime news and activity streams. Or more complex functionality for multi-user chat, collaborative applications (like Google Docs, Office Live and numerous online IDEs), multiplayer games, interactive 2nd screen experiences, realtime mapping and GIS (Geographic Information Systems) and - hopefully - much, much more!</p>

<p>I'm making the obvious predication that in 2014 <strong>realtime will become a fundamental part of a significant number of new mainstream applications</strong>.</p>

<p><a name="commodity"></a></p>
<h2>2. Commoditization of Realtime</h2>
<p>Since realtime is becoming so fundamental to application experiences, realtime functionality will make its way into many existing frameworks. This ultimately reduces the uniqueness of existing realtime solutions. This doesn't mean that dedicated realtime solutions aren't valuable, but it may mean that the use of some types of realtime (e.g. Pub/Sub) may diminish in the initial phases of projects.</p>

<p>Dedicated realtime services (hosted or otherwise) will be sought when scaling becomes necessary or tightly coupled architectures result in unwanted complexity. In this situation it's likely a move to loosely coupling architecture using a dedicated piece of realtime infrastructure is will be of benefit.</p>

<p>I'm actually really excited about this development as it means that existing solutions will need to <strong>"up their game"</strong> in order to present a compelling reason to use them at the start of a project. I'm hoping this will lead to lots of innovation when it comes to <strong>new features</strong> that meet common use cases and <strong>improved developer experiences</strong>. All the better for us developers!</p>

<p><a name="frameworks"></a></p>
<h2>3. More Realtime Frameworks</h2>
<p><img src="/wp-content/uploads/2014/02/icon_8451-150x150.png" alt="icon_8451" width="150" height="150" class="alignright size-thumbnail wp-image-24288" /></p>

<p>With realtime becoming core to so much application functionality we're undoubtedly going to see an <strong>increase in the number of frameworks that are built on the foundation of realtime</strong>. By this I mean their fundamental functionality is powered by realtime technology; WebSocket, EventSource/Server-Sent Events, HTTP Streaming, WebHooks etc. and the use of Pub/Sub and data synchronisation is core.</p>

<p>Right now we have <a href="http://sailsjs.org/">SailsJS</a>, <a href="http://www.socketstream.org">SocketStream</a>, <a href="http://meteor.com">Meteor</a> (a full platform) and <a href="http://derbyjs.com/">DerbyJS</a>, but I expect the number to grow significantly.</p>

<p><em>If you know of any others, please <a href="mailto:phil@leggetter.co.uk?subject=Realtime Framework">get in touch</a></em>.</p>

<p><a name="collaboration"></a></p>
<h2>4. The Power of Collaboration</h2>
<p><img src="/wp-content/uploads/2014/02/icon_27467-150x150.png" alt="icon_27467" width="150" height="150" class="alignright size-thumbnail wp-image-24298" /></p>

<p>Collaboration is probably the most powerful use case for realtime right now because it provides the most benefit; it enables and eases communication - absolutely key when working in any form of team - and it's an incredible time-saver.</p>

<p>Right now we're seeing lots of examples of chat, document editing, audio/video communication using WebRTC and proprietary technologies, and some drag n' drop experiences. But I'm very hopeful that we're going to see increasing innovation in the collaboration space.</p>

<p>Data synchronisation solutions appear to provide the best solution when it comes to collaboration because you are collaborating on the same data structure with others e.g. a data structure representing a document. So I'm going to carefully watch for updates to existing solutions and see if any new technologies or ideas surface.</p>

<p><a name="apis"></a></p>
<h2>5. Realtime APIs</h2>
<p>I'm very hopeful that companies who are offering an API as a core part of their business are very aware of the developments of realtime technologies and use cases. As such they should know of the value of exposing and sharing data in realtime. Any event within a system has associated data and there's opportunity to share that and act upon it.</p>

<p>There is no reason why API providers can't start exposing evented data via a realtime API. Whether that's an API powered by WebHooks, HTTP Streaming or WebSockets, this data has the potential to add even <strong>more value to the offerings of API providers</strong>. Getting data sooner could even be seen as a premium service!</p>

<p>API infrastructure provides such as <a href="http://www.3scale.net/">3Scale</a>, <a href="https://apigee.com/about/">Apigee</a>, <a href="http://www.layer7tech.com/">Layer7 Technologies</a>, <a href="https://www.mashape.com/">Mashape</a> and <a href="http://www.mashery.com/">Mashery</a>: <strong>please take note!</strong></p>

<p><a name="webhooks"></a></p>
<h2>6. Even more WebHooks</h2>
<p><img src="/wp-content/uploads/2014/02/icon_9094-150x150.png" alt="icon_9094" width="150" height="150" class="alignright size-thumbnail wp-image-24294" /></p>

<p><a href="http://en.wikipedia.org/wiki/Webhook">WebHooks</a> have been used for a very long time. But the term "WebHooks" used to define them is comparatively new. The great thing about having a commonly-used term is that it provides a way of communicating understood usage, encourages adoption, and leads to improved practices (and potentially standards).</p>

<p>We're seeing many more uses of WebHooks and it makes sense that the usage is going to increase further. This may be mainly because the web is still very HTTP-focused and the idea of publishing and receiving data via HTTP is understood and development can easily be undertaken.</p>

<p>See: <a href="http://blog.programmableweb.com/2012/01/30/webhooks-realtime-web/">What are WebHooks and how do they Enable the Realtime Web?</a>.</p>

<p><a name="service-apis"></a></p>
<h2>7. Realtime Service Powered APIs</h2>
<p>As mentioned in the "Commoditization of Realtime" prediction, hosted services offer a lot of value when it comes to scaling. Scaling realtime infrastructure is still relatively difficult so in order for API providers to facilitate point 5, "Realtime APIs", I believe it's highly likely that they will consider using existing Realtime Hosted API provides to do so.</p>

<p>Services like <a href="http://datasift.com">DataSift</a>, <a href="http://firebase.com">Firebase</a>, <a href="http://pubnub.com">PubNub</a>, <a href="http://pusher.com">Pusher</a> and <a href="http://superfeedr.com">Superfeedr</a> are in a great position. They already have the Realtime API infrastructure in place and in most cases they also have an authentication mechanism to enable a service to use them as their own infrastructure. The <a href="http://www.pubnub.com/blog/announcing-pam-serverless-access-control-for-your-app/">PubNub Access Manager</a> is a very good example.</p>

<p><a name="opensource-datasync"></a></p>
<h2>8. An Open Source Data Sync solution</h2>
<p><img src="/wp-content/uploads/2014/02/icon_7421-150x150.png" alt="icon_7421" width="150" height="150" class="alignright size-thumbnail wp-image-24290" /></p>

<p>There are a number of open source realtime solutions for transports like HTTP Streaming, HTTP Long-Polling and WebSocket, WebRTC (not fantastic, but growing) for scenarios like handling web browser connectivity and for common use cases like PubSub, RPC (Remote Procedure Call), RMI (Remote Method Invocation) and PubSubHubbub.</p>

<p>But I'm yet to find an open source solution that offers the same kind of data synchronisation functionality as <a href="http://firebase.com">Firebase</a> or <a href="http://goinstant.com">GoInstant</a>. I'm hopeful that a solution we be along shortly.</p>

<p><em>If you know of one, or built one, please <a href="mailto:phil@leggetter.co.uk?subject=Open Source Data Synchronisation">get in touch</a></em>.</p>

<p><a name="socketio"></a></p>
<h2>9. The Death &amp; Revival of Socket.IO</h2>
<p><a href="http://socket.io/">Socket.IO</a> has had an amazing influence on the uptake of realtime web technologies. It offered accessible and powerful functionality that demonstrated the benefits of realtime web functionality. It was also part of the Node.JS revolution which really helped it's cause.</p>

<p>However, for a long time the project <a href="https://github.com/LearnBoost/socket.io/graphs/contributors">wasn't maintained</a>. This has picked up recently and I'm hopeful that it means we're going to get an official 1.0 release soon. With so many companies and individuals using Socket.IO I'm surprised that somebody hasn't offered to sponsor development - or maybe they have, but it's just not public knowledge?</p>

<p><a href="https://github.com/LearnBoost/socket.io/graphs/contributors"><img src="/wp-content/uploads/2014/02/socket-io-contributions-1024x279.png" alt="Socket.IO contributions graph" width="1024" height="279" class="aligncenter size-large wp-image-24280" /></a></p>

<p>This tabloid-like headlined prediction is really to make the point that Socket.IO is a great solution that deserves some love. I can't see how this won't happen either through the original developers giving it more time (as they appear to be starting to do), through additional external contributions or through somebody else taking it on. It is <a href="https://github.com/LearnBoost/socket.io/blob/master/LICENSE">MIT</a> after all.</p>

<p><a name="iot"></a></p>
<h2>10. IOT &amp; Realtime</h2>
<p><img src="/wp-content/uploads/2014/02/icon_28698-150x150.png" alt="icon_28698" width="150" height="150" class="alignright size-thumbnail wp-image-24292" /></p>

<p>The Internet of Things (IoT) is a predicatable-predition, and something I've been talking about since at least 2011. In 2014 the usage of realtime web technology and IoT is going to skyrocket. IoT is already in near daily usage by hacking developers and during 2014 the usage is going to quickly increase in consumer technology.</p>

<p>Some solutions to watch out for include <a href="http://www.smartthings.com/">SmartThings</a>, <a href="ninjablocks">Ninja Blocks</a> and <a href="http://skynet.im/">SkyNet</a>.</p>

<p><a name="webrtc"></a></p>
<h2>Bonus 1: WebRTC Audio/Video and Data Channels</h2>
<p>A big deal has been made of WebRTC for audio and video communication. <em>And it is a very big deal</em> which will continue to result in lots of great apps using audio and video without the need to of costly infrastructure. But, the RTCDataChannel API has generally been overlooked, until recently. Dan Ristic gives a good <a href="http://www.html5rocks.com/en/tutorials/webrtc/datachannels/">overview of RTCDataChannel</a> which I recommend checking out to get you thinking about how peer-to-peer data could be used within your realtime apps.</p>

<p><a name="dev-tooling"></a></p>
<h2>Bonus 2: Better Realtime Developer Tooling</h2>
<p><img src="/wp-content/uploads/2014/02/icon_8949-150x150.png" alt="icon_8949" width="150" height="150" class="alignright size-thumbnail wp-image-24296" /></p>

<p>With this dramatic increase in development using realtime web technologies there's going to be an increased demand for tools that help the realtime app development process. We have some amazing tooling for request-response HTTP-based logging, debugging and playback. But when it comes to streaming or WebSocket solutions the tooling falls a little short. We instead rely on the libraries of solutions providing the necessary developer help.</p>

<p>I expect logging, debugging and tooling of existing solutions to improve and I also hope that we start to see dedicated tooling being created to help realtime web application development. Maybe <a href="http://runscope.com">RunScope</a> - who are pioneering developer tools as a service - will add WebSocket proxy support?</p>
<h2>Conclusion</h2>
<p>Realtime is going to be everywhere; from web and mobile apps to IoT consumer products. There are some interesting challenges to be undertaken when it comes to the UX of some of these apps and products, and to the Internet infrastructure which will be put under increasing load - an opportunity for solution providers to start thinking about adding features to help and cope with this.</p>

<p>The next 10 months of 2014 is going to be very exciting for realtime web technology, realtime solution providers, realtime hosted services, and more importantly for us developers. I expect some serious advancements in existing solutions and some new players to come along. Realtime web technology is going to become even easier to integrate into existing applications and we're going to have a much wider range of choice when building realtime apps from the ground up.</p>

<p>If you've seen any other trends, are building anything powering - or being powered by - realtime web technologies, or have predictions of your own please <a href="mailto:phil@leggetter.co.uk">get in touch</a>.</p>

<p>And don't forget, if you're interested in realtime you should consider heading along to <a href="http://www.apistrategyconference.com/2014Amsterdam/index.php">API Strategy Conference - March 2014</a> in Amsterdam and check out the Realtime API Panel.</p>

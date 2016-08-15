---
layout: post
title: "Review of Realtime Web Tech Predictions from 2014"
excerpt: "Back in February 2014 I wrote a list of 10 predictions for realtime web technologies in 2014 (well, it was 10 and 2 bonus items). In this blog post - sorry it's not 1 year on - I'll review they and provide my thoughts on whether those predictions were correct or not."

---

Back in February 2014 I wrote a list of [10 predictions for realtime web technologies in 2014](https://www.leggetter.co.uk/2014/02/24/10-realtime-web-technology-predictions-for-2014.html) (well, it was 10 and 2 bonus items). In this blog post - sorry it's not 1 year on - I'll review those predictions and provide my thoughts on whether they were correct or not.

Here's how I feel I did with the 10 predictions:

* 5 Correct <span style="color:green;">&#10004;</span>
* 3 Partially correct <span style="color:orange;">¯\\_(ツ)_/¯</span> There's evidence to suggest trends towards 3 of the predictions so I'm only going to say I was partially correct with those.
* 2 Incorrect <span style="color:red;">&#10008;</span>

I was 50/50 with the additional 2 bonus predictions.

Before I dive in I wanted to cover my two highlights of 2014.

The biggest news of the year in the real-time space was [Google's acquisition of Firebase](https://www.firebase.com/blog/2014-10-21-firebase-joins-google.html). I didn't predict this publicly, but I did actually ask [James Tamplin](https://twitter.com/jamestamplin) about this when I've met up with him in the past. I thought this was a possibility after Nest, who use Firebase for their API, was [acquired by Google](https://investor.google.com/releases/2014/0113.html) for $3.2 Billion. I personally also think that mobile is a big part of Google's decision since mobile developers tend not to want to deal with any infrastructure. Since Firebase offers login, persistence and security rules mobile devs don't have to. This will get developers onto the Google Cloud Platform which Firebase is - or probably will be - incorporated into.

On a personal note I was very pleased to have [rejoined Pusher](https://www.leggetter.co.uk/2014/12/04/rejoining-pusher.html). Although I'd [spoken at FOWA](https://www.leggetter.co.uk/2014/01/19/video-choosing-realtime-web-app-tech-stack.html), Hackference ([2015 is coming](http://2015.hackference.co.uk/)) and [Scotch on the Rocks 2014](http://lanyrd.com/2014/sotr/sctqhm/#link-zczb) about real-time technologies and written [an article on Socket.IO](http://www.creativebloq.com/web-design/build-real-time-app-socketio-11514083) for .NET magazine I was really missing being part of the real-time technology scene. It's great to be a part of it again and it's great to be back at [Pusher](https://pusher.com).

To the prediction reviews...

## 1. Realtime All the Apps - <span style="color:green;">&#10004;</span>

> realtime will become a fundamental part of a significant number of new mainstream applications.

<img src="https://www.leggetter.co.uk/wp-content/uploads/2014/02/icon_18986-150x150.png" alt="icon_18986" width="150" height="150" style="float:right; margin: 15px;" />

We saw lot's more apps use real-time technology in 2014. 4 of the [top 10 apps listed on time.com](http://time.com/3582114/top-10-apps/) offer realtime experiences including Facebook Rooms, WhatsApp, SnapChat and Uber. The first three are clearly notifications and chat the latter for real-time geolocation of taxis.

Apps that were probably already known of such as like [Slack](http://techcrunch.com/2014/10/31/slack-confirms-120m-fundraise-led-by-google-ventures-and-kpcb-at-1-12b-valuation/), HipChat, Asana, [QuizUp](http://techcrunch.com/2014/06/11/quizup-localization/) and [Wunderlist](http://thenextweb.com/apps/2014/07/31/wunderlist-completely-rebuilt-bid-become-home-worlds-lists/) saw significant growth - all offering highly real-time experiences.

Fantasy sports companies like DraftKings and FanDuel also saw [growth in 2014](http://www.bizjournals.com/newyork/blog/techflash/2014/11/fanduel-vs-draftkings-are-we-seeing-the-future-of.html?page=all). Both of these companies rely on real-time technology to deliver the gaming experience that makes them so popular.

There were so many real-time social apps - with a significant number of them offering "Instant Messaging" - that I'm quite happy to say I got this one right.

## 2. Commoditization of Realtime - <span style="color:red;">&#10008;</span>

> realtime functionality will make its way into many existing frameworks.

Real-time technologies had already made their way into stacks like [Rails](http://tenderlovemaking.com/2012/07/30/is-it-live.html) and [ASP.NET (through SignalR)]( https://blog.jcoglan.com/2013/10/01/announcing-faye-1-0/), and solutions such as [SwampDragon](https://github.com/jonashagstedt/swampdragon) came along for Django, but I didn't see a particular surge of easy to use Server-Sent Events or WebSocket in new versions of *existing frameworks*.

## 3. More Realtime Frameworks - <span style="color:red;">&#10008;</span>

> an increase in the number of frameworks that are built on the foundation of realtime.

<img src="https://www.leggetter.co.uk/wp-content/uploads/2014/02/icon_8451-150x150.png" alt="icon_8451" width="150" height="150"  style="float:right; margin: 15px;" />

From what I saw in 2014 I got this wrong. What I actually saw happen was existing frameworks further establish their dominance.

[Faye](http://faye.jcoglan.com/) and [socket.io](http://socket.io) gained in popularity, as did the existing and established real-time services such as Pusher, PubNub, Firebase and Realtime.co.

I was surprised to see GoInstant - who had been [acquired by Salesforce.com](http://techcrunch.com/2012/07/09/salesforce-com-reported-to-buy-goinstant-for-70-million/) for a serious sum - close down their service. This was another example that established players actually gained further adoption during 2014 and lesser known companies struggled with developer acquisition.

## 4. The Power of Collaboration - <span style="color:orange;">¯\\_(ツ)_/¯</span>

> I'm very hopeful that we're going to see increasing innovation in the collaboration space.

The main uses for real-time tech are still notifications (and signaling), activity streams (a set of notifications with history), real-time dashboards, visualisations and chat.

Although chat is a collaborative experience that offers significant UX and product value, it's not a particularly innovative use of the technology; it's not a new experience. I still really want to see more.

## 5. Realtime APIs - <span style="color:green;">&#10004;</span>

> There is no reason why API providers can't start exposing evented data via a realtime API.

If I'm entirely honest, before I sat down to write this follow-up post I thought I'd got this one wrong. It's not until you start to look at all the well-known services and APIs that you discover all those that are now offering real-time APIs of some kind; whether it's WebHooks or streaming endpoints.

![Realtime APIs](https://www.leggetter.co.uk/images/apps-with-realtime-apis.png)

Obviously, some of the examples above have had real-time APIs for a while, whilst some of them are new.

The main interesting trend here is that it's not just traditional API providers that are now looking to offer Real-Time endpoints. It's also more traditional consumer-facing solutions that are also getting into real-time technology and APIs.

I do think we're going to see even more growth here during 2015.

## 6. Even more WebHooks - <span style="color:green;">&#10004;</span>

> We're seeing many more uses of WebHooks and it makes sense that the usage is going to increase further.

I've just realised this is a bit of a cheat. Since the last prediction also covered a general increase in real-time tech for APIs, and WebHooks are most likely used within APIs, I kinda get this one for free.

## 7. Realtime Service Powered APIs - <span style="color:orange;">¯\\_(ツ)_/¯</span>

> in order for API providers to facilitate point 5, "Realtime APIs", I believe it's highly likely that they will consider using existing Realtime Hosted API provides to do so.

As noted at the start of this post, [Nest uses Firebase](https://developer.nest.com/documentation/cloud/architecture-overview). This is likely to be a dedicated Firebase instance, but it will most probably be an instance that's managed by the Firebase team (this is what we do for large clients at Pusher).

The main area I've seen a lot of uptake in the use of hosted services as real-time API infrastructure is for Bitcoin. [Bitstamp](https://www.bitstamp.net/websocket/) and [MtGox](https://en.bitcoin.it/wiki/MtGox/API/Pubnub) are two examples (although links from the second example seem to be broken now).

Then of course there's [Fanout](https://fanout.io) that although this service can help you "Build and scale realtime websites, apps, and APIs" seems well positioned for the the API space - infrastructure for your real-time APIs. Their performance will be a great indicator to see if this predication does *eventually* come true.

Communications API focused companies is another area that will likely start to see existing real-time infrastructure providers being utilised. [Sinch](https://www.sinch.com/) is a good example; they're actually a new company [spun out of Rebtel](http://techcrunch.com/2014/05/14/rebtel-spins-out-sinch-with-12m-in-funding-to-offer-communications-tools-to-developers/) and they use PubNub for signaling within their API.

So, I'm not going to claim this as wholly correct, but there is evidence that this is happening and I believe it will continue to do so.

## 8. An Open Source Data Sync solution - <span style="color:orange;">¯\\_(ツ)_/¯</span>

> I'm yet to find an open source solution that offers the same kind of data synchronisation functionality as Firebase or GoInstant. I'm hopeful that a solution we be along shortly.

I'm cheating a bit here because I actually need to admit that I missed a bunch of existing solutions in this space in 2013. Two big ones are [PouchDB](http://pouchdb.com/) and [ShareJS](http://sharejs.org/). This is particularly embarrassing because, firstly I did know about these solutions and secondly I actually personally know [Dale Harvey](https://twitter.com/daleharvey) who is a core contributor to PouchDB.

In addition to these I've also been contacted about [Lowla](https://github.com/lowla) that's still in early stages, but looks promising.

An interesting point to note in a related space is that PubNub did open up data sync functionality in beta during 2014. But the majority of the links to this feature on PubNub now either redirect or fail.

<a href="http://www.google.co.uk/search?q=pubnub+data&oq=pubnub+data&aqs=chrome..69i57j69i60l2j69i59.1437j0j1&sourceid=chrome&es_sm=119&ie=UTF-8&gws_rd=ssl&safe=strict#safe=strict&q=pubnub+data+sync"><img alt="Where has PubNub Data Sync gone?" src="https://www.leggetter.co.uk/images/pubnub-data-sync.png" /></a>

I'm not sure if this is due to PubNub's full product focus moving to "streams" or a lack of interest in another data sync solution. Does this, combined with the demise of GoInstant, suggest data sync doesn't have the expected demand? I would think [Syncano](http://www.syncano.com/) - a new BaaS - are betting on there still being big demand.

## 9. The Death & Revival of Socket.IO - <span style="color:green;">&#10004;</span>

> With so many companies and individuals using Socket.IO I'm surprised that somebody hasn't offered to sponsor development - or maybe they have, but it's just not public knowledge?

With so many companies and individuals using Socket.IO this was an easy prediction. It would seem that [CloudUp being acquired by Automattic](https://en.blog.wordpress.com/2013/09/25/cloudup-joins-the-automattic-family/) was a catalyst for this as Socket.IO is now supported by Automattic and lives under their GitHub organisation.

![Socket.IO revival](https://www.leggetter.co.uk/images/socketio-revival.png)

[Socket.IO v1.0 was released](socket.io/blog/introducing-socket-io-1-0/) in May 2014 and there have been spikes of activity every now and again since then.

## 10. IOT & Realtime - <span style="color:green;">&#10004;</span>

> In 2014 the usage of realtime web technology and IoT is going to skyrocket.

<img src="https://www.leggetter.co.uk/wp-content/uploads/2014/02/icon_28698-150x150.png" alt="icon_28698" width="150" height="150" class="alignright size-thumbnail wp-image-24292">

What a year for the Internet of Things! Although I think this year will be even bigger. I don't think I really need to write anything here to justify my opinion that I got this one right. It wasn't a difficult prediction.

> Some solutions to watch out for include SmartThings, Ninja Blocks and SkyNet.

SmartThings was [acquired by Samsung](http://blog.smartthings.com/news/smartthings-updates/smartthings-samsung-open-platform/) in August 2014 and [SkyNet renamed to Octoblu](https://gigaom.com/2014/07/21/octoblu-launches-to-make-skynet-internet-of-things-tools-professional-grade/) and [Chris Matthieu](https://twitter.com/chrismatthieu) - who was behind SkyNet (as far as I'm aware) - is now Director of IoT Engineering at Citrix.

Ninja Blocks also seem to be doing pretty well with lots of partnerships.

![Ninja Blocks partners](https://www.leggetter.co.uk/images/ninja-blocks-partners.png)

Take a look at the [Ninja Blocks blog](http://blog.ninjablocks.com/).

## Bonus 1: WebRTC Audio/Video and Data Channels - <span style="color:green;">&#10004;</span>

> A big deal has been made of WebRTC for audio and video communication. And it is a very big deal which will continue to result in lots of great apps using audio and video without the need to of costly infrastructure.

2014 was jam-packed with apps - from hacks to products - with a focus on in-browser audio and video. These were mainly chat applications with quite a few of them focusing on helping remote workers communicate with each other; [sqwiggle](https://www.sqwiggle.com/), [appear.in](https://appear.in/) and [talky](http://talky.io) were, and are, pretty popular. Twilio are also pushing pretty hard with their [Twilio.js](https://www.twilio.com/docs/client/twilio-js) client which uses WebRTC. We'll see WebRTC used more and more on mobile in 2015 too.

I'm sure we're going to see [more done](https://bloggeek.me/webrtc-data-channel-uses/) with the data channels in the future.

We've also seen the emergence of companies like Sinch - who I mentioned earlier - and [respoke](https://www.respoke.io/) that seem very focused on peer-to-peer audio, video and data connectivity over WebRTC.

## Bonus 2: Better Realtime Developer Tooling - <span style="color:red;">&#10008;</span>

> I expect logging, debugging and tooling of existing solutions to improve and I also hope that we start to see dedicated tooling being created to help realtime web application development.

Although there does seem to be a big increase in [tooling to help developers work with WebHooks](http://john-sheehan.com/blog/ultimate-api-webhook-backend-service-debugging-testing-monitoring-and-discovery-tools-list) I was really hoping for improved tooling around HTTP Streaming, Server-Sent Events, WebSockets and in-browser developer tooling improvements. In my opinion this hasn't happened.

## Conclusion - <span style="color:green;">&#10004;</span>

I'm pretty confident and happy to say that I got 5 our of 10 Real-Time Web Technology predictions correct and that there are still signs that 3 of the other ones may happen.

The real-time technology space is strange in that it's taking a comparatively long time for adoption to really pick up. The technology has been around for 15 or so years and even companies like Pusher have now been around for nearly 5 years. But the angle of inclination of the upwards curve is definitely increasing. I'm very much looking forward to see what happens in 2015 and beyond.

I may even talk and blog about it. And maybe provide some more predictions... **If you'd like me to talk at your event about Real-Time Technology or write an article, please [get in touch](mailto:phil@leggetter.co.uk?subject=Real-Time Tech Talk or Article).**

![Phil Leggetter speaking at DevWeek 2015](https://www.leggetter.co.uk/images/me-devweek-2015.jpg)

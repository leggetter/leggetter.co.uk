---
layout: post
status: publish
published: true
title: Developers Want Realtime
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
wordpress_id: 23525
wordpress_url: "https://www.leggetter.co.uk/?p=23525"
date: "2012-11-06 14:56:13 +0000"
date_gmt: "2012-11-06 14:56:13 +0000"
categories:
  - Technology
tags:
  - realtime
  - api-fanboy
  - what developers want
  - mashery
  - BAPI2012
permalink: /2012/11/06/developers-want-realtime.html
thumb: /images/thumb/developers-want-realtime.png
excerpt: "I'm on the What Developers Want panel at the Business of APIs Conference London, arranged by Mashery. I'm also giving a lightening talk on my take on What Developers Want. Unsurprisingly I believe they wany the APIs to offer access to their data in Realtime. Here are the details."
---

<p>I'm on the "What Developers Want" panel at the <a href="http://apiconference.com/about-2012/london-2012/">Business of APIs Conference London</a>, arranged by <a href="http://www.mashery.com/">Mashery</a>. I'm also giving a lightening talk on my take on "What Developers Want".</p>
<p><iframe width="480" height="302" src="http://www.ustream.tv/embed/recorded/26755655/highlight/310780?v=3&amp;wmode=direct" scrolling="no" frameborder="0" style="border: 0px none transparent;">    </iframe></p>
<p><a href="http://www.ustream.tv/" style="padding: 2px 0px 4px; width: 400px; background: #ffffff; display: block; color: #000000; font-weight: normal; font-size: 10px; text-decoration: underline; text-align: center;" target="_blank">Video streaming by Ustream</a></p>
<p>Unsurprisingly I believe they wany the APIs to offer access to their data in Realtime. Here are the details:</p>
<h2>What Makes An API Awesome?</h2>
<p>We now have a better idea than ever before what is required to offer an awesome API.</p>
<ul>
<li>Our <strong>developer portals</strong> speak to developers, making it clear what our API offers and how it can benefit them.</li>
<li><strong>Documentation</strong> is well structured, easy to understand and full of lovely code examples</li>
<li>Our API follow <strong>best practices</strong> to ensure they can be easily understood, consumed and to building confidence in our solution.</li>
<li>We offer well maintained <strong>API libraries</strong> to further speed up the integration of the API using our favourite technologies, to make commonly executed tasks even easier to perform and hide away complexity of some of the more advanced ones.</li>
<li>We have amazing <strong>tooling</strong> that not only lets us test how we interact with an API and the responses we get (e.g. <a href="http://www.mashery.com/product/io-docs">io docs</a>) but also provides us with detailed information about how the API interpreted the interaction and exposing the inner workings of our service in relation to the developers functionality</li>
<li>We are <strong>building communities</strong> of <strong>heroes</strong> who champion our product</li>
</ul>
<h2>What more can we offer?</h2>
<p><strong>Realtime!</strong> Let me explain:</p>
<p>Developers have to make lots of calls to our APIs; make queries to retrieve data, to see if data has changed, to see if new data is available. Take a query as an example: do you have any new information for me?... do you have any new information for me? How about now? Now?</p>
<p>Wouldn't it be great if the instant your API had new or updated information that it was pushed to the developer? You developer has already expressed an interest in data from you by calling your API.</p>
<p>Start thinking about:</p>
<ul>
<li>A query to your API isn't always just a one off search or transction. Does is really represent a <strong>subscription for data</strong>? If so, offer a way of making that call a subscription.</li>
<li>When <strong>new data</strong> is created that matches a query push it to them.</li>
<li>When data that a developer has retrieved <strong>changes</strong> within your system, push it to them.</li>
<li>Better yet, give them a way of using that technology directly within their client applications so <strong>push data directly to the users of their applications</strong>.</li>
</ul>
<p>How much effort would this save the developer? How much value would this add to your API? How cool would this be for the developer?</p>
<p>So, how can you push this information to your developers?</p>
<h2>Realtime Web Technologies</h2>
<h3>The PubSub Paradigm</h3>
<p>In order to push information to developers you need to know that they are interested in that data. The <a href="http://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern">Publish Subscriber pattern</a> makes this possible.</p>
<h3>WebHooks</h3>
<p><a href="http://en.wikipedia.org/wiki/Webhook">WebHooks</a> offer a way of instantly pushing information from one server to another via a simple HTTP call. Since you have a list of subscribers when you receive new information that matches a subscription or information that a developer is insterested in updates you can push it to a URL. Simple!</p>
<h3>HTTP Streaming</h3>
<p>HTTP Streaming offers a way of holding a HTTP connection open so that your API can instantly push new information over that existing connection. This is probably an option if your data updates quite frequently.</p>
<h3>WebSockets</h3>
<p><a href="http://en.wikipedia.org/wiki/WebSockets">WebSockets</a> offer a way of maintaining a connection between a server and a client. This lets you instantly push information from the server to the client, but also lets the two instantly communicate in general. WebSockets are an amazing opportunity to API providers for a couple of reasons:</p>
<ol>
<li>You can instantly deliver information to any applicaiton that is connected to the web; web apps, mobile apps, networked robots.</li>
<li>From the point of view from a developer this means they don't need any infrastructure to deal with the delivery of this realtime data. You are providing that for them. This infrastructure can be very real benefit to the developer.</li>
</ol>
<h2>Realtime APIs - I Want Proof</h2>
<p>Here are just a few of the many companies who are successfully using Realtime Web Technologies as a core part of their API.</p>
<h3>Pusher</h3>
<p><a href="http://pusher.com">Pusher</a> is a hosted WebSockets API so we're delivering this benefit to our customers every day. It's also possible to potentially use Pusher as your WebSockets API. Just a thought!</p>
<h3>Twilio</h3>
<p>Twilio use WebHooks to let the developer know when an SMS is recieved on a phone number or when there is an incoming call. They also use WebSockets in the Twilio client.</p>
<h3>SendGrid</h3>
<p>SendGrid use WebHooks as part of their <a href="http://sendgrid.com/docs/API%20Reference/Webhooks/event.html">Event</a> &amp; <a href="http://sendgrid.com/docs/API%20Reference/Webhooks/parse.html">Parse</a> functionality.</p>
<h3>DataSift</h3>
<p>DataSift offer a HTTP Streaming API so that they can instantly deliver new interactions which meet the criteria you've defined in your DataSift streams.</p>
<h3>MailChimp</h3>
<p>MailChimp offer <a href="http://apidocs.mailchimp.com/webhooks/">WebHooks</a> for a number of events within their system including new subscriptions, unsubscribes, profile changes, email address changes and more.</p>
<h3>Twitter</h3>
<p>Twitter have a number of <a href="https://dev.twitter.com/docs/streaming-apis">HTTP Streaming API endpoints</a> so that the developer is instantly informed whenever a new tweet is found.</p>
<p><strong>And many more…</strong></p>
<h2>Realtime = More Awesome</h2>
<p>The technology to let you offer these improved <strong>Developer Experiences</strong> exist in the form of Realtime Web Technologies. So, start thinking about how you can use them to make things easier for them and take that next step in making your API even more awesome.</p>
<p><img src="http://f.cl.ly/items/3L1Q2530423b473T1O2F/bapi2012_dev_panel.jpg" alt="What Developers Want Panel at BAPI 2012" /></p>

---
layout: post
status: publish
published: true
title: Comment on Real-Time Delivery Explained post by feedmyinbox
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 4936
wordpress_url: "http://www.leggetter.co.uk/?p=4936"
date: "2011-01-12 13:46:22 +0000"
date_gmt: "2011-01-12 13:46:22 +0000"
categories:
  - Technology
tags:
  - pubsubhubbub
  - http streaming
  - polling
  - feedmyinbox
  - brightwurks
  - real-time protocol
permalink: /2011/01/12/comment-on-real-time-delivery-explained-post-by-feedmyinbox.html
---

<p><a href="http://www.brightwurks.com">Brightwurks</a>, who develop <a href="http://www.feedmyinbox.com/">Feed My Inbox</a>, have just posted a <a href="http://www.brightwurks.com/blog/real-time-delivery-explained">blog article</a> explaining the Real-Time Delivery of blogs, feeds and news to an email inbox. The article discusses polling and real-time protocols. They list the Twitter API as a real-time protocol although they do know it's not actually an example of a real-time protocol and explain this later in the post. I've just posted a comment clarifying that although the Twitter API is not a real-time protocol it does use a real-time technology that we are starting to see being used more and more to deliver data in real-time.</p>
<p>Here's my comment in full slightly edit to better suit a blog post.</p>
<blockquote><p>As you state the Twitter API is not a real-time protocol. I'm assuming that you will be using one of Twitters streaming APIs - either the <a href="http://dev.twitter.com/pages/streaming_api_methods#statuses-filter">filter API method</a> or maybe the <a href="http://dev.twitter.com/pages/user_streams">users streams API</a>.</p>
<p>Although not a real-time protocol these are examples of using a HTTP Streaming API to receive instant notifications. HTTP Streaming seems to be becoming the API technology of choice when the speed of notifications really matters and I think we are going to see a lot more APIs offer this. I wrote an article recently on Programmable Web that covers this topic a bit further and discusses <a href="http://blog.programmableweb.com/2011/01/06/real-time-data-delivery-http-streaming-versus-pubsubhubbub/">HTTP Streaming verses PubSubHubbub</a>.</p>
<p>So, I would suggest you update the real-time protocols section and state HTTP Streaming being another method for real-time data delivery (still not strictly a protocol), use the Twitter API as an example of an API using HTTP Streaming to deliver data in real-time and also update the docs links to point to <a href="http://dev.twitter.com">dev.twitter.com</a>.</p>
<p>Hope this information is useful.</p></blockquote>

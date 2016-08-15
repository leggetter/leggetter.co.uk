---
layout: post
status: publish
published: true
title: A Real-Time Web business by-product example
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
excerpt: "Ian Sanders recently posted a great thought provoking <a href=\"http://scrambledup.blogspot.com/2010/04/what-are-your-business-by-products.html\">blog article about business by-products</a>. I won't go into detail, Ian's post does that, but it's basically about finding value in things that aren't your key business focus but what you just have to do, day to day, in order to run your business or do your job.\r\n\r\nI've just this minute finished a Skype chat with a work colleague. As I was having the chat I realised that the conversation we were having had real value. It was a really good question to be asking and that if I didn't record this conversation now that I'd probably lose it and the potential value would be lost.\r\n\r\n"
wordpress_id: 790
wordpress_url: "https://www.leggetter.co.uk/?p=790"
date: "2010-04-09 12:40:39 +0100"
date_gmt: "2010-04-09 11:40:39 +0100"
categories:
  - Technology
  - Real-Time Web Musings
tags:
  - real-time web
  - ian sanders
permalink: /2010/04/09/a-real-time-web-business-by-product-example.html
---

<p>Ian Sanders recently posted a great thought provoking <a href="http://scrambledup.blogspot.com/2010/04/what-are-your-business-by-products.html">blog article about business by-products</a>. I won't go into detail, Ian's post does that, but it's basically about finding value in things that aren't your key business focus but what you just have to do, day to day, in order to run your business or do your job.</p>
<p>I've just this minute finished a Skype chat with a work colleague. As I was having the chat I realised that the conversation we were having had real value. It was a really good question to be asking and that if I didn't record this conversation now that I'd probably lose it and the potential value would be lost.</p>
<p><a id="more"></a><a id="more-790"></a></p>
<p>So, here's the conversation. I've posted it in its raw format but I'll write a bit of JavaScript to spruce up the look over the next hour.</p>
<blockquote><p>[12:13:30] Adam DeWeb: can I ask you a question about the REAL TIME WEB?<br />
[12:13:59] Phil Leggetter: Oh yes. I'm very knowledgeable in that area you know :O)<br />
[12:14:09] Adam DeWeb: yes, I found you by googling<br />
[12:14:28] Phil Leggetter: I'm sure you didn't really. If you did I'd be very excited.<br />
[12:14:36] Adam DeWeb: what I don't understand is, I get how everything from one of our real-time APIs to all other subscribed real-time APIs is true real time<br />
[12:14:58] Adam DeWeb: but I don't see how you get that initial hop from the raw datasource to the real-time API to be push, and if you can't do that then it's not real time<br />
[12:15:16] Adam DeWeb: e.g if the data comes from a database and your kwwika client queries the database every 5 seconds then you're polling, not push<br />
[12:15:32] Phil Leggetter: you can have database triggers<br />
[12:15:50] Phil Leggetter: they fire whenever a new row is inserted or an update occurs<br />
[12:16:10] Phil Leggetter: or a web developer may choose to send the update out as they are about to, or have just updated the database<br />
[12:16:41] Adam DeWeb: ok<br />
[12:16:56] Adam DeWeb: do you think it's always going to possible to get that first hop to be push though? not just databases but what about twitter etc<br />
[12:17:07] Adam DeWeb: I know twitter has a push feed now<br />
[12:17:16] Adam DeWeb: hmm, I've run out of examples where it wouldn't work<br />
[12:17:45] Phil Leggetter: I think it's a good example<br />
[12:17:59] Phil Leggetter: these sorts of things should probably be in an FAQ<br />
[12:18:35] Adam DeWeb: I guess the point is that for it to be true real time it has to be push all the way through the chain<br />
[12:18:50] Adam DeWeb: if people didn't get that and they were doing polling at the back end then they'd lose the advantage<br />
[12:20:11] Phil Leggetter: I think there are two ways of looking at it. Yes, our system can deliver stuff in Real-Time if you hook your components up correctly. But, just being able to enable push data in any application without setting up any infrastructure is a really big thing - to me anyway.<br />
[12:21:21] Adam DeWeb: oh ok, I thought our key differentiator (or whatever the marketing people say) was going to be that our thing is "real" real time and the rest isn't, but that's a good selling point as well. Probably better actually<br />
[12:22:07] Phil Leggetter: I think our "real" real-time ability is a massive plus but the web hasn't really come around to PUSH yet so that's our first mission.<br />
[12:22:48] Adam DeWeb: cool beans<br />
[12:24:52] Phil Leggetter: Ok. This is a great example of a valuable by-product of general work: http://scrambledup.blogspot.com/2010/04/what-are-your-business-by-products.html</p></blockquote>

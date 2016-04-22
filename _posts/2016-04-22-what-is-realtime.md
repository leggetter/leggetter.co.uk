---
layout: post
title: "What is Real-Time?"
excerpt: "What is Real-Time? – it’s a question that is asked a lot. It’s a fundamental question that I’m sure many are curious to get a definition for. In this post I'll clarify what real-time is and focus on the context of web, mobile and IoT apps."

---

<small>This was originally written by me and published on the [Pusher blog](https://blog.pusher.com/what-is-real-time/)</small>

**What is Real-Time?** – it’s a question that is asked a lot. It’s a fundamental question that I’m sure many are curious to get a definition for. And many a developer that’s worked with embedded systems may have even been annoyed when they hear “real-time” in the context of the Web or the Internet applications. So, to clarify things once and for all let’s address the question of “What is Real-Time?” and apply it to the context of Web and Internet applications.

There are three types of real-time system and application classification: hard, firm, and soft.

## Hard real-time

> Hard Real-Time: missing a deadline is a total system failure.

In Star Trek, the Starship Enterprise uses a warp core as the main energy reactor. The safety system for the warp core needs to identify potential problems within a finite amount of time. If it doesn’t then it’s [saucer separation](http://en.memory-alpha.org/wiki/Saucer_separation) time, or worse!

That is, the time between a problem occurring within the warp core and the safety system knowing about it has a **hard deadline** or there is a significant system failure. That’s **Hard Real-Time**.

You wouldn’t use [real-time web technologies](http://www.leggetter.co.uk/real-time-web-technologies-guide/) as part of the Enterprise safety system. But you might use them in a hard real-time system if the deadline is sufficiently long and if the real-time technology offers some form of guaranteed delivery (simple receipt acknowledgement may suffice).

## Firm real-time

> Firm Real-Time – infrequent deadline misses are tolerable, but may degrade the system’s quality of service. The usefulness of a result is zero after its deadline.

Trading and betting systems are good examples of firm real-time systems. The important thing with these systems is that they are aware that messages may arrive outside of the deadlines and offer appropriate logic to deal with it. For example, if a user executes a trade on a given price you can’t absolutely guarantee that the “trade now” message will hit the trading system by the deadline so you need a mechanism to inform the user that a firm deadline was missed.

## Soft real-time

> Soft Real-Time – the usefulness of a result degrades after its deadline, thereby degrading the system’s quality of service.

The majority of real-time applications that we use fall into this category. Twitter, Facebook, any form of real-time chat, Google Docs, Uber and many more. Quite how much the “usefulness degrades” and what impact that has really depends on the application. A delayed document update in Google Docs reduces the user experience and can potentially result in duplicate/wasted effort. Missed Uber taxi position updates might result in a delayed journey or extra effort required to locate the exact taxi position.

## How does this apply to Real-Time Web, Mobile and IoT Applications?

Classifying your real-time apps – Web, Mobile, IoT or Star Trek systems – as hard, soft or firm is worthwhile for a couple of reasons. Firstly, you will be in a better position to explain yourself when confronted by folks who have a strong opinion about the use of “real-time” in applications. Secondly, and most importantly, it’ll make you think about the deadlines you should impose on the real-time data within your systems and how the applications that use that data should behave.

If you are building a real-time application and using the Internet as your communication network then you can really only think in terms of **firm** or **soft** real-time apps.

## “What is Real-Time?” Answered! Where next?

Now that we’ve clarified and classified the types of real-time and addressed the “What is Real-Time?” question we can finally move on to things like *discovering the real-time data* within our systems and apps and then *understanding the potential uses of that real-time data* to increase our knowledge of what are applications are doing _right now_ and building real-time features that improve our product.

<!--
Now that we’ve clarified and classified the types of real-time and addressed the “What is Real-Time?” question we can finally move on to things like [discovering the real-time data](http://www.leggetter.co.uk/2016/04/23/discovering-realtime-data-in-your-apps.html) within our systems and apps and then [understanding the potential uses of that real-time data](http://www.leggetter.co.uk/2016/04/24/use-cases-for-your-realtime-data.html) to increase our knowledge of what are applications are doing _right now_ and building real-time features that improve our product.
-->

<small>Quoted definitions are taken from the [Real-Time Computing entry](https://en.wikipedia.org/wiki/Real-time_computing) on Wikipedia</small>

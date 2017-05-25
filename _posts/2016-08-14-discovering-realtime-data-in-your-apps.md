---
layout: post
title: "Discovering the Real-Time Data in Your Apps"
excerpt: "Real-time notifications, data visualisation, communication, collaboration… Whether the aim is to improve user experience or to facilitate the management of your infrastructure, the ability to collect, process, and deliver data in real-time is critical. Every application has real-time data. In this post I'll cover how to find that real-time data with any application that you build."

---

Real-time notifications, data visualisation, communication, collaboration… Whether the aim is to improve user experience or to facilitate the management of your infrastructure, the ability to collect, process, and deliver data in real-time is critical.

Every application has real-time data, but turning this data into useful functionality requires three steps:

1.  Identify the points within a system where it can be found.
2.  Know how to make it accessible to other systems and applications.
3.  Understand how to consume and use the data within an application in order to build real-time features.

During this series of posts on **real-time data discovery** I’ll show you how to identify the real-time data within your apps, give you some examples of what you can do with that data and finally I’ll provide some examples of how to do it. This series is based on a talk I’ve given so there’s also a “You have real-time data” screencast that we’ll share with the final post.

In this first edition I’ll prove to you that you do have real-time data in your apps and tell you where you can find it. If you’re asking yourself “What is Real-Time?” in the context of real-time web and Internet apps then first take a look at the [What is Real-Time?](/2016/04/22/what-is-realtime.html) post.

With the background out of the way, let’s find that real-time data!

## Where do you find Real-Time Data?

Back in 2011 Mike Brevoort gave a number of talks with the title **The Evented Web**. In those talks he covered things like WebHooks, Comet and [WebSocket](https://en.wikipedia.org/wiki/WebSocket). But in reviewing the [slides](http://www.slideshare.net/brevoortm/the-evented-web) from these talks recently there were two that really stood out.

![2011 Mike Brevoort - the Evented Web slide](https://www.leggetter.co.uk/images/call-you-406x300.png)
<small>[2011 Mike Brevoort – the Evented Web](http://www.slideshare.net/brevoortm/the-evented-web)</small>

This slide makes two very important points that are as relevant in 2015 as they were in 2011.

> When something happens

Something happening in a system is an **event**. An event is likely to have an associated data payload that contains information about what just happened.

> I’ll just call you

Instead of having to ask a system to see if anything has happened, the system will instead tell the interested parties about it. It will **push** the event and associated data to other systems.

A few slides later Mike depicts a change taking place (in code) and the update being pushed to GitHub. GitHub then notifies a number of interested parties about that change; Jenkins CI for build, Boxcar for Push Notifications, Jira to resolve an issue and GAE for some custom functionality. These events are all triggered by a **change**.

![GitHub, WebHooks, Interactions & Events - 2011 Mike Brevoort - the Evented Web](https://www.leggetter.co.uk/images/github-webhooks-403x300.png)
<small>[2011 Mike Brevoort – the Evented Web](http://www.slideshare.net/brevoortm/the-evented-web)</small>

What these slides tell us is that if you can identify the events within your systems then you you’ve found real-time data. Additionally they tell us that events are caused by **changes in data** (in this case the code) and **interactions** (the push of the code to GitHub).

## Events – Changing Data

Applications are data-driven. They create data, display data, allow data to be updated and, in some cases, deleted. These operations are often referred to as [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) which stands for **C**reate, **R**ead, **U**pdate and **D**elete and it’s quite easy to find these within your applications.

Of course, database interactions are also system interactions. But databases contain… well… data and any interaction with such a system has the high probability of representing a change in data. So it’s worth showing some specific examples.

Firstly you can look for any SQL statements:

```
INSERT INTO activities ...

UPDATE activities WHERE ...

```

NoSQL document interactions such as this [MongoDB](https://www.mongodb.org) example:

```
var insertDocument = function(db, callback) {
   db.collection('activities').insertOne( {
      "text" : "Phil is talking"
   }, function(err, result) {
  });
};

```

Or any interactions with an [ORM (Object Relational Mapper)](http://en.wikipedia.org/wiki/Object-relational_mapping)

```
Activity a = repository.GetActivity(10);
a.text = "Phil is still talking";
p.save();

```

## Events – System Interactions

Next let’s take a look at some other, more generic, system interactions.

### Web Endpoints

Something that all web apps will have is a web endpoint. Whether to serve HTML content to users or as part of a Web API, each interaction represents an event with an associated data payload. Whether it’s Sinatra, Rails, Express, SailsJS, Flask, Django, Laravel, Silex, ASP.NET MVC … all of these frameworks provide ways of defining routes and web endpoints. Each interaction produces real-time data.

With Sinatra:

```
post '/interact' do
  # endpoint called
end

```

Or Express:

```
app.post('/interact', function(req, res) {
  // endpoint called
});

```

### Requests & Responses

If any web endpoint interaction is an interaction event then so is any request and response.

```
var request = require('request');

var url = 'https://www.leggetter.co.uk';
request(url, function (error, response, body) {
  // response
});

```

The request event data has a URL and the potential for some payload depending on the type of request. The response event provides the result data. All real-time data as it happens.

### Logging

We log information about what’s going on within our applications as it happens. We log it because it has some use. Not only historically, but also – for certain log levels – the instant that the log entry is created.

In Ruby using `logger`:

```
require 'logger'
$LOG = Logger.new('log_file.log', 'monthly')   
$LOG.debug("I'm logging stuff!")

```

In Node using `winston`:

```
var winston = require('winston');
winston.log('critical', errorEventPayload)

```

If we’re logging at `critical` then surely there’s much more value in getting that data now – in real-time – than there is grepping the logs after the event.

### Many more system interactions

Web endpoints, request/response, logging, CRON jobs, incoming email… how about any form of I/O? Systems interactions are events that take place with a data payload that in some cases should be instantly distributed and exposed by other systems to use right away.

What other types of interaction are there?

### User Interactions

User interaction events and associated data payload represent real-time data. A user navigating a website is ultimately a browser interacting with a web endpoint. But there is additional data associated with that interaction; the user data. In a SPA (Single Page App) a user navigating views, clicking the UI, moving the mouse, touching the screen, dragging, typing; each an interaction, each with not only the action data, but also the user data to give much richer context.

When users communicate with each other it is a clear real-time interaction – _@mentioning_ being a good example. However, other actions like commenting on a post is an action where other users may want to know about that comment quickly in order to change the experience into a conversation. A user updating data that others are interested in becomes an event that results in user-to-user interactions.

## You Have Real-Time Data

Real-time data discovery in your apps is actually pretty easy. If you weren’t convinced that you had real-time data within your apps when you started reading this blog post, I hope you are now. If you have events in your web apps, there are changes in data, or there are any interactions between components and systems then **you do have real-time data**. And now you know where you can find it!

## Next

In the next post of this series I cover what you can do with the real-time data that you already have; from using the data to understanding what’s going on in your systems right now to building awesome real-time features for your users.

<small>Originally written by me and published on the [Pusher blog](https://blog.pusher.com/real-time-data-discovery-in-your-apps/)</small>
---
layout: post
title: "How to Describe, Publish & Consume Real-Time Data"
excerpt: "In this final post in the real-time data series we’ll cover the how: how to describe, publish & consume real-time data from your systems and expose the data so that you can build real-time features. The main steps we’re going to cover are doing Analysing & Processing, Describing the data, Publishing the data and finally Consuming and Using that data within and app."

---

In the first post in the series we covered [discovering real-time data](https://www.leggetter.co.uk/2016/08/14/discovering-realtime-data-in-your-apps.html) within your systems and applications. In part two we went through the [use cases for your real-time data](https://www.leggetter.co.uk/2017/05/24/use-cases-for-your-realtime-data.html). In this final section we’ll cover **the how**: how to describe, publish & consume real-time data from your systems and expose the data so that you can build real-time features.

The main steps we’re going to cover are doing the following with the real-time event data:

*   Analyse/Process
*   Describe
*   Publish
*   Consume and Use

## Analysing & Processing Real-Time Data

The amount of analysis and processing of your data that is required really depends on whether the data is already in a form that you can instantly use. If it’s very **simple data** and you have everything you need then you can instantly share it to be used within apps. If it’s **complex data** or requires some additional analysis then you need to do that work before you share it.

Unless there amount of work you’re doing on the data is minimal it’s recommended that you do that work asynchronously. If you got that data from a system interaction, such as a web request, then doing the work there will delay the response to that web request. The same rule applies if you need to put the data into a database in order to perform a query; don’t perform the query within the same context (thread) as the one you received the event and associated data. Instead, do the work in another process.

Here’s one approach to doing this correctly.

### Example: Using RethinkDB

[RethinkDB](http://rethinkdb.com/) is an open source database built for the real-time web. The reason it’s such a good fit is due to a feature called [changefeeds](https://rethinkdb.com/docs/changefeeds/). In the following example, where `r` is the RethinkDB reference, we first update the number of `points` that a player has:

```
r.table("players")
  .get(playerId)
  .update({points: newPoints})
  .run(conn, callback);

```

We have `playerId` to identify a player to update and we’re updating the `points` value to be `newPoints`.

Elsewhere in code (another file or even another process entirely) we could have the following:

```
r.table('players')
  .orderBy(index=r.desc('points'))
  .limit(5)
  .changes().run(conn)
  .then(top5pointsUpdated);

```

We’re querying the `players` table, ordering the result `desc`ending by points and limiting the number of results by `5`. There’s nothing particularly different in this approach to any other database (other than maybe the ReQL syntax). The interesting bit is that the `top5pointsUpdated` function passed to `then` is called any time that the query result changes. That’s because we’ve identified this query as a changefeed through the use of `changes()`. So, any time the `update` code we covered earlier is executed the `top5pointsUpdated` function will be called.

In a more traditional database these could be considered [triggers](https://en.wikipedia.org/wiki/Database_trigger). The main things are that it’s _evented_ and that it nicely separates the updating code from the changefeed (trigger) handling code. The asynchronous nature of this code allows it to be executed outside of the incoming event thread/context or in a different process. This is just one example and there may be other solutions allow you to achieve similar functionality.

## Describing Real-Time Data

Systems, applications, and developers building real-time applications and features need a way of registering their interest in data. One of the simplest and most commonly used approaches to this is provide a name or identifier for the data that can be used when registering interest. Publish-Subscribe fits very well here, where data is identified by a `channel`, `topic` or `subject`.

In addition to being able to identify what the data is, it’s very useful – especially within evented systems – to know what is happening to the data. What event has taken place that has resulted in the new or changed data? We call this **Evented Publish-Subscribe**.

To summarise:

*   Use channels, topics or subjects to identify the data
*   Use events to identify what is happening to the data

If you’ve got relatively simple data within your systems then deciding how to identify the data can be easy. There may be a database schema or document that already exists with a name that you can also use as the channel name. Or if you’re using an [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping) solution then the model name may be a good name for the channel. So, for an activity stream where there’s a database table called `activities` or in an ORM where there’s a model called `Activity` then `activities` is a good choice for a channel name.

When it comes to naming events – what has happened to the data – then the standard [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) terminology may be the right solution; `created`, `read`, `updated` and `deleted`/`destroyed`. It may be that `read` is used much less than the other operations, although building features that inform other users that somebody is accessing data can be really useful.

For more complex data it’s probably best to name the channel based on the analysis or query that’s taking place. In the RethinkDB example we covered earlier we were creating a query representing the top 5 players in a game. So, a channel named `top-5-players` would be a good channel name and `updated` may be an appropriate event name.

## Publishing Real-Time Data

Once you’ve described your data you need a mechanism for distributing that data to interested parties (we’ll cover how those parties register their interest in the next section).

In the following example using the [node-orm2](https://github.com/dresende/node-orm2) ORM package and the Socket.IO we’ll see how this can be achieved for a simple data change:

```
Activity.create(
  {text: "Phil is talking"},
  function(err, activity) {
    if(err) throw err;

    io.of('/activities').emit('created', activity);
  });

```

In this code a new activity has been created so we’ve triggered an event called `created` on the `activities` namespace passing the newly created `activity` as the event data payload.

```
Activity.get(activityId, function (err, activity) {
  activity.text = "Phil is still talking";
  activity.save(function (err) {
    io.of('/activities').emit('updated', activity);
  });
});

```

The code above shows that updating is simply a matter of changing the event name to `updated`. You can work out how `deleted` and any other event could easily be represented in code and communicated.

For the RethinkDB, more complex example we looked at earlier, the code would look as follows:

```
r.table('players')
  .orderBy(index=r.desc('points'))
  .limit(5)
  .changes().run(conn)
  .then(top5pointsUpdated);

function top5pointsUpdated(cursor) {
  var top5 = [];
  cursor.each(function(err, item) {
    top5.push(item);
  });
  io.of('/top-5-players').emit('updated', top5)
});

```

_Note: In the above code we know the function passed to `cursor.each` called synchronously_

In the above code we’ve implemented the `top5pointsUpdated` function. It loops over the updated result, adds those results to an array and triggers and event via Socket.IO. The name of the channel is `top-5-players`, since that’s the query being made and clearly identifies what the data is. The name of the event is `updated` since the result value has been updated.

In this example we’re using RethinkDB for the processing and analysis, and Socket.IO for the publishing of the data. Other solutions will offer similar abstractions to help you process and then publish your real-time data.

For completeness, here are some of the examples of publishing data for the other scenarios that were mentioned in the [discovering real-time data](https://www.leggetter.co.uk/2016/08/14/discovering-realtime-data-in-your-apps.html) blog post.

### Web Endpoints

In this example using the [Socket.IO](https://socket.io) the code triggers an event any time the `/interact` web endpoint is accessed. It then triggers an event on the `endpoints` channel with an event name of `new_interactions`. The event data is the parameters that are used when accessing the endpoint.

```js
app.post('/interact', function (req, res) {
  io.of('/endpoints',
        'new_interaction',
        {
          endpoint:'interact'
          post_data: params
        });
        
  res.status(200)
})
```

You could create some middleware that intercepts web requests and instead share the endpoint that was interacted with along with the HTTP parameters as the event data. Using this you could build a real-time analytics dashboard.

### Requests & Responses

Setting up a request:

```js
var request = require('request');
var url = 'http://www.google.com';
io.of('web-request').emit('outgoing', {url: url});

```

Making the request, handling the response and sharing the data:

```
request(url, function (error, response, body) {
  if(error) {
    io.of('/web-request').emit('incoming-error', {url: url, error: error});
  } else {
    io.of('/web-request').emit('incoming-success', {url: url, body: body});
  }
});

```

This example may be useful for some kind of real-time analytics, but could also be useful if you wanted to make a call to a process to kick-off the request and then let you real-time framework – Socket.IO in this case – inform you when the result is ready (background process completion notifications). In the code above we’ve used the event names, `incoming-error` or `incoming-error`, to identify if the request was successful or not. This separation also makes it clear that the event data we get for each will be different.

### Logging

Logging for custom system analytics:

```
var winston = require('winston');
function log(level, data) {
  winston.log(level, data);
  io.of('/logging').emit(level, data);
}
log('info', {'some': 'data' });

```

This example just uses a `log` function wrapper to both log using [Winston](https://github.com/winstonjs/winston) and also emit an event via Socket.IO. In real life you may instead create a `realtime-log-listener` and configure your logging to use that. In this example the channel is hard-coded to `logging` and the event name is the log level. But it could be that using the level as the channel name (e.g. `logging-{level}`) may be a nicer approach to partition the data.

## Consuming & Using Real-Time Data

Now that it’s clear how the data is published, how do you go about consuming that data within an application? Well, we’ve covered how we identify and describe the data earlier so we use that mechanism for consuming the data. Again, we’ll show an Evented Publish-Subscribe example using Socket.IO.

First, let’s take a look at the code for publishing the data from the server:

```
var activities = io.of('/activities')
activities.emit('created', activity);
activities.emit('updated', activity);
activities.emit('deleted', activity);

```

The corresponding code uses the [Socket.IO](https://socket.io) in the client (the consumer) to identify the data (using namespaces) and then register interest in what’s happening to the data (using events):

```
var activities = io('/activities');

activities.bind('created', function(activity) {
  // Add to the UI
});

activities.bind('updated', function(activity) {
  // Update the UI
});

activities.bind('deleted', function(activity) {
  // Remove from the UI
});

```

First we reference to the `activities` namespace using `io('/activities')` and then we bind to each event we’re interested in (`created`, `updated` and `deleted`). In each case we have as separate callback to handle each of those events which nicely separates our code into functional blocks.

The code really speaks for itself due to its simplicity. Although the activities example is used here I’m sure you can see how it maps to the web endpoints, requests/responses and logging examples that have been shown earlier.

## Conclusion

This post has discussed whether you need to analyse and process your real-time data and where you should do that. We’ve then looked at the importance of describing your data and how you can do that. Finally we’ve provided examples of publishing and then consuming your real-time data. From there it’s really up to you to start adding the real-time features – that were covered in the [real-time features and use cases](https://www.leggetter.co.uk/2017/05/24/use-cases-for-your-realtime-data.html) post – to your applications.

In this series we’ve covered [identifying the real-time data](https://www.leggetter.co.uk/2016/08/14/discovering-realtime-data-in-your-apps.html) with your apps and systems, the [real-time features](https://www.leggetter.co.uk/2017/05/25/describe-publish-consume-realtime-data.html) you can build with your data and in this post we’ve covered **how to describe, publish & consume real-time data**.

If you’re interested in digging into this a bit further I’ve recorded a screencast that covers some of the information from these posts entitled [You have real-time data. You just don’t know it.](https://www.youtube.com/watch?v=rk5Jm1IHxlI). You can also find out more about strategies for dealing real-time data and real-time development best practices in a talk I gave at FOWA London, [Tools, Tips & Techniques for Developing Real-Time Apps](https://www.youtube.com/watch?v=KPEcK4zFuyw).

I’m really pleased to have finally put together a series on some of the fundamentals of building real-time apps. I’d love to hear your thoughts and experiences on the topics I’ve covered and more. So please [get in touch](mailto:phil@leggetter.co.uk).

<small>This was originally written by me and published on the [Pusher blog](https://blog.pusher.com/how-to-describe-publish-consume-real-time-data/)</small>
---
layout: post
status: publish
published: true
title: "Fundamentals of the Realtime Web & Realtime Web Functionality"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 24059
wordpress_url: "http://www.leggetter.co.uk/?p=24059"
date: "2013-10-31 16:26:41 +0000"
date_gmt: "2013-10-31 16:26:41 +0000"
categories:
  - Technology
tags:
  - websockets
  - pusher
  - websocket
  - firebase
  - server-sent events
  - eventsource
  - data synchronisation
  - RMI
  - pubsub
  - publish subscribe
  - signalR
  - sockjs
  - onmessage
permalink: /2013/10/31/fundamentals-realtime-web-realtime-web-functionality.html
thumb: /images/thumb/realtime-fundamentals.png
---

<p>In part 1 of this 3-part write-up from my talk at FOWA London 2013 I covered the <a href="/2013/10/28/history-background-benefits-use-cases-realtime.html">History, Background, Benefits &amp; Use Cases of Realtime</a>. In this 2nd part I'm going to provide details on some fundaments about realtime web technology and an overview of the basic types of functionality that they offer.</p>

* Part 1: <a href="/2013/10/28/history-background-benefits-use-cases-realtime.html">History, Background, Benefits &amp; Use Cases of Realtime</a>
* Part 3: <a href="/2013/12/09/choosing-realtime-web-app-tech-stack.html">Choosing your Realtime Web App Tech Stack</a>
* The FOWA 2013 [Choosing your Realtime Web App Tech Stack video](/2014/01/19/video-choosing-realtime-web-app-tech-stack.html)

<p><img src="/wp-content/uploads/2013/10/realtime-fundamentals.png" alt="" /></p>
<p>What are the core concepts used in realtime web technologies? What are the fundamental raw technologies?  And, is it possible to break the types of functionality up into categories?</p>
<p><img src="/wp-content/uploads/2013/10/realtime-connect.png" alt="" /></p>
<p>This one's pretty obvious! You need to connect to the source of data in order to receive new information from it. Without that connection there's no way of the new data being pushed to the intended recipients.</p>
<p>Ideally this will be a long-held persistent connection.</p>
<p><img src="/wp-content/uploads/2013/10/still-polling-oh-dear.png" alt="" /></p>
<p>So, <strong>STOP POLLING</strong>.</p>
<p>If you check <em>very infrequently</em> for new data via a polling strategy that may still be okay. But in general, if you're polling at short intervals you are very likely to:</p>
<ul>
<li>Be using resources unnecessarily</li>
<li>Have code complexity that isn't required</li>
</ul>
<p>Realtime web solutions are now very solid and efficient so you really should be using them. In fact, if you use a realtime web server instead of polling a standard web server you will:</p>
<ul>
<li>Use less client and server resources</li>
<li>Reduce the complexity of your code</li>
</ul>
<p>Here's the server code that is executed when new data is available and updates the database:</p>

```php
<?php
$update = $_POST['update'];
$data = json_decode($update, true);

$query = sprintf("INSERT INTO updates (key, value) VALUES ('%s', '%s')",
    mysql_real_escape_string($data['key'], $data['value']));

$result = mysql_query($query);

if($result) {
  header("HTTP/1.1 201 Created")
}
else { header("HTTP/1.1 418 I'm a teapot"); }
```

<p>Here's some JavaScript that polls the server every 5 seconds to see if any new data is available:</p>

```js
var lastUpdate = new Date();
setInterval(function() {
 $.getJSON('ajax/get_update.php?since=' + lastUpdate, function(data) {
   var items = [];

   $.each(data, function(key, val) {
     items.push('&lt;li id="' + key + '"&gt;' + val + '&lt;/li&gt;');
   });

   $('#my_list').prepend(items);
 });
 lastUpdate = new Date();
}, 5*1000);
```

<p>Here's the server code that handles that polling request:</p>
<pre><code>&lt;?php // get_update.php
$since = $_GET['since']; // assume format is correct

$query = sprintf("SELECT updates WHERE created &gt; '%s'",
    mysql_real_escape_string($since));

$result = mysql_query($query); // assume no errors

$rows = array();
while($r = mysql_fetch_assoc($result)) {
  $rows[] = $r;
}
return json_encode($rows);
</code></pre>
<p>Now, let's look at a usage scenario:</p>
<ul>
<li>Site average of 10,000 users online at any one time</li>
<li>Over 1 Hour, with a 5 second polling interval</li>
<li>Pages load + resources estimate (HTML, CSS, JS, Images) = 50,000</li>
<li>Poll requests per minute = (60 / 5) = 12</li>
<li>Poll requests per hour = (12 * 60) = 720</li>
<li>Poll requests site-wide per hour = (360 * 10,000) = 7,200,000.</li>
<li><strong>Total: 7.2 Million requests</strong></li>
</ul>
<p>Get scaling!</p>
<p>By using a realtime web technology you have dedicated and specialised resource to maintain those 10,000 persistent connections.</p>
<p>And the code would look something like this:</p>
<p>The JavaScript:</p>
<pre><code>var connection = new Connection( 'realtime.example.com' );
var channel = connection.subscribe( 'my-channel' );
channel.bind( 'my-event', function( data ) {
  var items = [];
  $.each( data, function( key, val ) {
    items.push( '&lt;li id="' + key + '"&gt;' + val + '&lt;/li&gt;' );
  } );

  $( '#my_list' ).prepend( items );
});
</code></pre>
<p>On the server we can completely remove the code that handles the polling request. All we need to do is update the code after we've updated the database. This additional code publishes the new data to all interested recipients:</p>
<pre><code>&lt;?php
require('Realtime.php');

$update = $_POST['update'];
$data = json_decode($update, true);

$query = sprintf("INSERT INTO updates (key, value) VALUES ('%s', '%s')",
    mysql_real_escape_string($data['key'], $data['value']));

$result = mysql_query($query);

if($result) {
  $realtime = new Realtime();
  $realtime-&gt;trigger('my-channel', 'my-event', $data);

  header("HTTP/1.1 201 Created")
}
else { header("HTTP/1.1 418 I'm a teapot"); }
</code></pre>
<p><small>Note: this code hasn't been checked - there may be a few errors. It's here to demonstrate a point</small></p>
<p>Here the call to trigger may push the data onto a message queue to be processed by the dedicated realtime infrastructure, or it may be to make a call to a hosted service to handle the distribution of that data.</p>
<p>There is much less code in the realtime scenario and it's also less complex.</p>
<p>In this scenario we have:</p>
<ul>
<li>Site average of 10,000 users online at any one time</li>
<li>Over 1 Hour, <strong>no polling</strong></li>
<li>Pages load + resources estimate (HTML, CSS, JS, Images) = 50,000</li>
<li><strong>That's it! Our standard web servers handle 50,000 requests</strong></li>
<li>During the hour our realtime infrastructure maintains 10,000 persistent connections</li>
</ul>
<p><img src="/wp-content/uploads/2013/10/comet-hacks.png" alt="" /></p>
<p>Many developers have understood the benefits of the timely delivery of data, the business value, the resource savings and the reduced complexity that realtime could offer (reduced complexity is a relatively recent thing).</p>
<p>But in order to achieve a persistent connection we had to use technology in ways it hadn't been intended to be used. Not only that, but the solutions were different depending on the web browser. <strong>We hacked the solutions</strong>.</p>
<p>Terms you may have heard before include <strong>HTTP Streaming</strong> and <strong>HTTP Long-Polling</strong>. Traditionally these have been hacks. And, just like the UK Comet Superstore, we want those hacky solutions to go away.</p>
<p><img src="/wp-content/uploads/2013/10/w3c-realtime-standards-ftw.png" alt="" /></p>
<p>And thanks to standardisation, they eventually will.</p>
<p>The fact that so many developers were trying to achieve "realtime push" meant that the standards body had to take note. After a number of years, and contribution from many of those developers who contributed to the hacked solutions, we now finally have two solutions that let us natively support realtime communication in our web browsers.</p>
<p><strong>But, it's not just web browsers!</strong> Because these are defined standards it means that they can be implemented in any technology. From web browsers, native mobile runtimes to constituents of the Internet of Things (search "Arduinos" for some great examples).</p>
<p><img src="/wp-content/uploads/2013/10/sse-websockets.png" alt="" /></p>
<p>The two solutions we now have are:</p>
<ul>
<li><a href="http://en.wikipedia.org/wiki/Server-sent_events">Server-Sent Events</a> and the <a href="https://developer.mozilla.org/en-US/docs/Web/API/EventSource">EventSource API</a> - this is an HTTP-based solution, but taking a standardised approach and avoiding the "hacks".</li>
<li><a href="http://en.wikipedia.org/wiki/WebSocket">WebSocket</a> - The WebSocket protocol and API is probably the most exciting standard. It allows for a persistent, bi-directional, full-duplex connection to be established between a client and a server.</li>
</ul>
<p>When you are building truly interactive applications you are going to need bi-directional communication. And - as we'll see - even if you're building apps focusing on live content only you'll probably need a level of functionality that will still require bi-directional communication.</p>
<p>Hence, <strong>WebSockets are the best realtime client-server communication transport available</strong>.</p>
<p><strong>Do not let anybody tell you otherwise!</strong></p>
<p><img src="/wp-content/uploads/2013/10/still-need-realtime-hacks.png" alt="" /></p>
<p>Unfortunately we do still need the hacks for scenarios such as:</p>
<ul>
<li>Where older browsers don't support these new standards</li>
<li>When tricky networks get in the way. These normally tend to be locked down corportate or educational networks, and some mobile network operators</li>
</ul>
<p>Therefore, the realtime technology you choose needs to handle these "fallback" scenarios for you.</p>
<p><img src="/wp-content/uploads/2013/10/realtime-functionality.png" alt="" /></p>
<p>We now understand that we need to connect. But what about receiving data, and what sort of functionality should a realtime solution provide? How should the client and server interact with each other in order for you to add realtime functionality to your application?</p>
<p>I've broken this down into four types of functionality. This isn't perfect, but it's a good starting point.</p>
<p><img src="/wp-content/uploads/2013/10/realtime-data-streams.png" alt="" /></p>
<p>If you are pushing relatively simple pieces of data from the server to your client then a simple <code>onMessage</code> type of functionality may well be good enough.</p>
<p><em>Note: I'd like a better name for this but I've gone with <code>onMessage</code> as it reflects the basic level of functionality offered by the <code>EventSource</code> API and is also on the <code>WebSocket</code> API.</em></p>
<p><img src="/wp-content/uploads/2013/10/onmessage-code-example.png" alt="" /></p>
<p>In the example above we use a <a href="https://github.com/sockjs">SockJS</a> realtime solution. We connect to our realtime server, assign a function handler to the <code>onmessage</code> property, and that's it.</p>
<p>On the server we do some setup, but in order to push data to the client we simply use the <code>write</code> function on the connection object to push the data.</p>
<p>This is the most basic level of functionality. Here SockJS is a great solution as it focuses on basic messaging and connectivity. If you want to, you can layer on much more complex functionality.</p>
<p><img src="/wp-content/uploads/2013/10/pubsub.png" alt="" /></p>
<p>The <a href="http://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern"><strong>Publish/Subscribe</strong> pattern</a> is something that the majority of developers understand. In realtime web technology it's the most common form of functionality offered and is very data-centric.</p>
<p>With a PubSub solution you normally subscribe to data using a <code>string</code> identifier. This is normally called a Channel, Topic or Subject.</p>
<p>As the data within your application becomes more complex and you wish to receive updates when subsets of data change, or you have naturally partitioned your data, <strong>PubSub</strong> works very well.</p>
<p><img src="/wp-content/uploads/2013/10/realtime-subscriptions.png" alt="" /></p>
<p>Although most of us understand PubSub I still like to provide a silly example to try and get us thinking about scenarios that we don't generally associate with subscriptions. In doing that it can get us in the mindset of considering more scenarios as data subscriptions. And in turn, get us thinking about exposing changes in data to users and systems, where we presently let that <strong>change event</strong> go unnoticed.</p>
<p>My silly example is:</p>
<p>If I do a search for "aliens" in Google I get a relatively fresh set of results returned and displayed to me. Once that data is returned it instantly becomes historical.</p>
<p>If we were then to experience an <a href="http://www.imdb.com/title/tt0116629/">Independence Day (movie) moment</a>, and the sky around our planet were suddenly filled with Alien spacecraft, this Google search would not be showing me the most relevant information <strong>right now</strong>.</p>
<p>Google should instead be pushing updates of reports of Alien sightings from news channels, pictures of Aliens that have been posted to social networks (because, of course we'd stop to snap that Alien with a ray-gun instead of running), and as the Alien's invade our digital space I'd want to see them in my search results!</p>
<p>Now, Google did have a <a href="http://en.wikipedia.org/wiki/Google_Real-Time_Search">realtime search</a> solution in the past. I'm not sure quite why they dropped it. Maybe it was because they didn't want to renew their subscription to the Twitter Firehose? I think the lack of this feature is a mistake.</p>
<p>So, start thinking about scenarios in your applications that represent subscriptions. A user being on a URL, where they have an obvious interest in the data on that page, could easily be considered a subscription.</p>
<p><img src="/wp-content/uploads/2013/10/pusher-realtime-pubsub.png" alt="" /></p>
<p>The example above uses <a href="http://pusher.com">Pusher</a>.</p>
<p>On the client I connection and then subscribe to an <code>alien-search</code> channel. This channel name is simply a name I've chosen to use within my application. On that channel object, that represents the subscription, I then bind to different types of events:</p>
<ul>
<li><code>new_result</code> - a new search result has become available</li>
<li><code>result_updated</code> - an existing result I already have has been updated</li>
<li><code>results_deleted</code> - an existing result has been deleted</li>
</ul>
<p>This maps really nicely with C<span style="text-decoration: line-through;">R</span>UD operations. As with the channel name, the event names are entirely up to me.</p>
<p>When these events are received by the client the appropriate callback function is called and we can update our application accordingly.</p>
<p>On the server the functionality is really simple. When the event occurs (a new search result is available, one is updated etc.) we trigger the appropriate event on the channel.</p>
<p>Using a realtime PubSub solution should - and is - this simple.</p>
<p>Not all PubSub solutions will offer the event abstraction that Pusher do. I think it's really powerful and maps very nicely to the evented nature of realtime applications.</p>
<p><img src="/wp-content/uploads/2013/10/realtime-data-sync.png" alt="" /></p>
<p>The next type of functionality that is available is <strong>data synchronisation</strong>. In data sync solutions the focus is manuipulating data structures and ensuring that all applications get a synchronised version of that data structure.</p>
<p>An obvious example of this is Google Docs where the data, that represents the document that multiple users are editing, is synchronised between all users.</p>
<p>In these scenarios it's also worth being aware of <a href="http://en.wikipedia.org/wiki/Operational_transformation">operational transforms</a> - basically detecting and handling data edit collisions.</p>
<p><img src="/wp-content/uploads/2013/10/firebase-realtime-sync.png" alt="" /></p>
<p><a href="http://firebase.com">Firebase</a> offer a synchronisation solution. In the code above a structure is referenced and a piece of data added to the collection.</p>
<p>Event handlers are bound on the data reference so that any time new data (a child) is added, a child is changed, or removed, the application is informed. This is very powerful and <strong>very easy</strong> as I found out when I won the <a href="/2013/03/29/how-i-won-the-esri-devsummit-100-lines-of-javascript-competition.html">ESRI 100 Lines of JS challenge</a> - yeah, 5 lines of code to add realtime collaborative functionality!</p>
<p>You can see how this could be mapped to a PubSub solution, and maybe it's an abstraction on top of PubSub, but the point here is that it's all about working with a data structure which is a relatively complex abstraction and a specific style of functionality.</p>
<p><img src="/wp-content/uploads/2013/10/realtime-rmi.png" alt="" /></p>
<p>The final style of functionality is RMI - <strong>Remote Method Invocation</strong>. Some refer to this as the Object Oriented cousin of <a href="http://en.wikipedia.org/wiki/Remote_procedure_call">RPC</a>. It is ultimately about interacting with objects, and calling methods on them, over a network.</p>
<p>This is amazingly powerful.</p>
<p>It's important to remember that a interacting with an object could result with a network call. PubSub makes that relatively clear, but the RMI abstraction can hide this away to the extent that you may forget you're making network calls.</p>
<p><img src="/wp-content/uploads/2013/10/signalr-realtime-rmi.png" alt="" /></p>
<p>The above examples using <a href="http://www.asp.net/signalr">SignalR</a> which is now part of ASP.NET. The SignalR framework does provide simple low-level messaging functionality, but the framework, and their docs, primarily focuses on RMI functionality using something they've called <a href="http://www.asp.net/signalr/overview/signalr-20/hubs-api/hubs-api-guide-server">Hubs</a>.</p>
<p>Hubs provide a way of defining objects on the server and the framework creates client-side JavaScript proxy objects to that exposes the server-side functionality.</p>
<p>In this example, a <code>ChatHub</code> extends a <code>Hub</code> object in order to offer the RMI functionality. On the client the chat hub proxy object can be reference via <code>$.connection.chatHub</code>.</p>
<p>The server defines a <code>Send</code> method which can be accessed on the client via <code>chat.server.send</code>.</p>
<p>On the server the SignalR framework exposes a way of calling a function on all connected clients via the <code>Clients.All</code> property. In this case it calls a <code>broadcastMessage</code> function.</p>
<p>The client defines a <code>chat.client.broadcastMessage</code> function which can, and is, invoked from the server.</p>
<p>As I said, this is very powerful!</p>
<h3>Next: Choosing your Realtime Web App Tech Stack</h3>
<p>By now you should have a good idea of why realtime rocks (is beneficial to users and for your business), have an understanding of some of the raw fundamentals (hacks, Server-Sent Events and WebSocket) and that the functionality can roughly be broken down to onMessage, PubSub, Data Synchronisation and RMI.</p>
<p>In part 3 I'll demonstrate how you can use all this information when <strong>Choosing your Realtime Web App Tech Stack</strong> (wow, that title still isn't catchy!).</p>

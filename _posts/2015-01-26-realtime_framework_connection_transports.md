---
layout: post
title: "Realtime Connection Transports"
excerpt: "In this post I'll take a look at why HTTP-based transports are still used by realtime frameworks and services, why don’t all solutions use WebSocket, and which transports are best for different realtime use cases."

---

Many tout WebSocket as a long awaited transport technology for realtime communication on the web. For many years developers have hacked around with HTTP to try and achieve “realtime push” (a.k.a. server push), where the server "pushes" data to the client. WebSocket was the solution that was born out of the requirement to provide a standardised solution to replace the hacks. But some solutions are still using HTTP transports such as **Polling**, **Long-Polling** and **Streaming**. So has WebSocket failed to live up to its promise? 

In a [previous post](https://blog.pusher.com/what-came-before-websockets/) I go into mechanism for achieving HTTP transports. In this post I'll take a look at why HTTP-based transports are still used by realtime frameworks and services, why all solutions don’t use WebSocket, and which transports are best for different realtime use cases.

## What is Realtime?

When we talk about realtime in combination with web apps, mobile apps and IoT devices we mean something different to realtime in vehicle breaking systems or the USS Enterprise warp core safety system. The latter require hard realtime; when antimatter containment is lost that core needs to be ejected within a hard deadline or the ship is lost. Realtime on the web is generally soft; the usefulness of the data can degrade over time without system failure.

![Warp Core Breach](https://c2.staticflickr.com/4/3088/4561801219_a4199e3dea_b.jpg)

So, you don't want to control your warp core safety system using a realtime web framework. But there are still plenty of use cases and some of those can be business critical. You just need to be aware that you're reliant on network infrastructure (the Internet) that you many not control to relay messages - and have appropriate fallbacks within your system.

You're probably wondering how fast are these realtime frameworks then? Based on the stats I've gathered from six hosted services the average of all those providers is around 380ms from a message being sent to it being delivered.

The use cases for the technology vary widely but can roughly be broken down in to the following:

* Notifications & Signalling
* Activity Streams
* Data displays
* Chat
* Second Screen experiences
* Live geolocation tracking
* Multi-user collaboration
* Multiplayer games

Now that we've covered a bit of background about the technology and how it's being used let's have a brief look at the history and current status of the realtime connection transports.

## HTTP Long-Polling & Streaming Hacks

Many years ago - at least as far back as 2000 - there were a few companies that were doing all they could to work around the [request-response](http://en.wikipedia.org/wiki/Request%E2%80%93response) limitations of HTTP. Those companies had a use case where they needed to *push* information from the server to one or more **web browsers** as soon as the data became available (this is way before IoT and connected devices were on anyone’s radar.).

In 2000 the `XMLHttpRequest` object didn't exist within web browsers and the term *AJAX* hadn't even been invented. Realtime Web pioneers would work around browser limitations with Java Applets (remember those?), FRAMES, IFRAMES, dynamically generated script tags, ActiveX controls and all number of hacks to try to maintain a long-held connection between client and server.

Even when the `XMLHttpRequest` object arrived it didn't help because it started out being only available in IE (created for Outlook Web). Even when the other browsers adopted it, it wasn't easy to maintain a persistent connection between client and server. Browser quirks and security limitations held realtime technology advancement, adoption and usage exploration back.

*Note: For a more in-depth look at the types of hacks please check out the [Comet (Programming) Wikipedia page](http://en.wikipedia.org/wiki/Comet_(programming)) and [What came before WebSocket?](http://blog.pusher.com/what-came-before-websockets/).*

![Hackers](http://images.kino.de/flbilder/max96/bf96/bf20_21/b9620021/w964.jpg)

So we hacked! And hacked! And worked around the imposed limitations.. And this is why HTTP-based solutions like HTTP-Streaming and HTTP Long-Polling are traditionally hacks; they worked around protocol and browser limitations and restrictions; they did this in inconsistent ways and played on browser quirks to achieve the desired server-push functionality.

*Note: If you're also interested in a higher level background about how realtime went mainstream take a look at the [History, Background, Benefits & Use Cases of Realtime](https://www.leggetter.co.uk/2013/10/28/history-background-benefits-use-cases-realtime.html) part of my realtime web tech guide.*

## Why still use HTTP transports?

If HTTP-based solutions are so "hacky" why do so many realtime solutions still use them? Remember those browser quirks? Well, *we now have standards!* The ways you would achieve in-browser HTTP Streaming and HTTP Long-Polling became standardised and much easier to achieve, no matter which browser is used. 

So are HTTP Streaming and HTTP Long-Polling still hacks? These HTTP-based solutions are used in so many frameworks and there are use cases where they are a good fit. Specifically, when the majority of communication is from server to client (see *HTTP Shortcomings* below).

In fact you could considered HTTP Streaming and Long-Polling as standardised as [Server-Sent Events](http://en.wikipedia.org/wiki/Server-sent_events). All browsers [other than IE](http://caniuse.com/#feat=eventsource) presently offer an `EventSource` API within the browser.

Looking at the glass half full, HTTP does work everywhere. Proxies and firewalls understand HTTP and know how to work with it. There are still pieces of network infrastructure that don't like long-held connections so we do still need Long-Polling and even standard polling right now.

WebSocket, on the other hand, is still a comparatively new technology with [great browser support](http://caniuse.com/#feat=websockets) that is unfortunately hindered by ageing network infrastructure that *also gets in the way of progressive HTTP connectivity*. Not only that, but the WebSocket protocol went through a number of revisions on the way to [RFC 6455](https://tools.ietf.org/html/rfc6455). And, because the process was quite a long one, there are a number of clients that are using older incompatible versions of the protocol. As a result, solutions that support WebSocket ideally should support these older protocol versions.

A final reason why frameworks and services may still be using HTTP over WebSocket is that you still need polling and at least some sort of long-polling and streaming for those scenarios where a WebSocket connection can't be established. This means that frameworks or services must have some form of connection management and strategy to support failover between connection transports. Managing the ability to connect over HTTP and WebSocket within a framework, service and supporting libraries can be complex: some opt to stick with HTTP only, although *nearly* all major services and frameworks now offer WebSocket and HTTP connectivity.

You can find out more about the complexity of multi-transport connection management in Pusher's post on [adding HTTP fallback](http://blog.pusher.com/pusher-2-0-0-cutting-edge-websockets-with-comprehensive-legacy-support/) to compliment their WebSocket-focused service.

## HTTP Shortcomings

If you decided to read [what came before WebSocket article](http://blog.pusher.com/what-came-before-websockets/) before reading this far you already know why HTTP falls short. For those that didn't read that article it's pretty simple: HTTP supports the request-response cycle so you can initially send data to the server. But once the server has initiated the response the client can't send any additional information to it over that same connection. You can think of the initial request as a kind of handshake and from that point on it's essentially a uni-directional communications channel from server to client. Even with Keep-Alive where the underlying TCP connection can be reused between requests and HTTP Pipelining **you can't achieve bi-directional communication over a single persistent HTTP connection**.

Why does any of this matter? As we start to build applications with more interactive functionality we’re going to see a dramatic increase in the communication that takes place between client and server. Realtime technologies will be fundamental to supporting that level of communication whilst maintaining a great user experience. Underpinning all of this will be the requirement to provide bi-directional communication support over a single efficient connection.

**And that's why we need WebSocket.**

## Why we need WebSocket

The main purpose of WebSocket is to provide a standardised way to solve all the problems we get with HTTP.

A WebSocket connection is a single bi-directional [full-duplex](http://en.wikipedia.org/wiki/Duplex_%28telecommunications%29#Full-duplex) connection between the client and server. The protocol itself is also much less verbose than HTTP resulting in smaller message payloads. The bi-directional full-duplex connectivity along with the **smaller payloads** results in **lower latency** messaging and more **efficient connections**<sup>†</sup>. In a world where increasingly content is being consumed over mobile devices, this will directly impact customer satisfaction, thanks to increased battery life, lesser usage of the data plan, speed, etc. As a result, WebSocket is becoming the must have transport in any realtime framework or service.

*<sup>†</sup> See [Additional Reading](#additional_reading) for more justification on the above statements.*

## Transports & Their Most Suited Realtime Uses Cases

Finally, I'd like to provide some information on where I believe the available realtime transports are most suitable. I'll do this based on the following criteria:

* **Message frequency** - how often messages should be sent
* **Bi-directional** - support for two-way communication over a single connection
* **Message latency** - latency between the message being published and delivered
* **Connection efficiency** - data over the wire and general resource usage on client and server
* **User experience** - appropriate usage to maintain a reasonable user experience

I'll then provide the most appropriate use case for each of the realtime connection transport types.

### HTTP Polling (Short-Polling)

HTTP Polling is fine for updates that don't need to be delivered quickly *and* where updates happen infrequently. As frequency of polling increases, so does the load on the server and strain on the client. You can use the request to send data to the server and the response to get the fresh data. However, this means client data must be queued until the next request is sent. Each request outside of the polling cycle results in an additional connection.

Along with being inefficient, the user experience is impacted if the data within the application needs to maintain context. If the data is delivered late then it's of no use to the user of the app.

HTTP Polling is therefore suitable for lots of use cases where the data doesn't update all that frequently and where the data being stale (out of date) doesn't really matter.

### HTTP Long-Polling

You won't waste as many round trips with this transport as you do with standard polling. As the folks at Fanout say, [it doesn't totally suck](http://blog.fanout.io/2013/03/04/long-polling-doesnt-totally-suck/). But during the reconnect cycle you *could* be seeing stale data during request-response cycle where there’s no server-client connection. And If updates come in frequently then there could be a lot of highly inefficient request-response cycles.

Data can be sent to the server as part of the request but that means new client data will need to wait for the next poll interval. Additional server requests can be made which result in an additional open connection.

When the freshness of data is not essential and client to server communication is infrequent then Long-Polling is a suitable solution. It's not ideal for things like financial trading where freshness of data is imperative or multiplayer games and collaborative experiences where messages representing important changes in data are being sent from client to server.

### HTTP Streaming

HTTP Streaming is generally the best of the HTTP solutions and probably as efficient as WebSocket for pushing data from the server to the client.

However, it's a uni-directional connection meaning that a second connection needs to be made to achieve bi-directional communication. When data needs to be sent to the server a second connection must be opened. And if lots of data is being sent to the server then data is queued until the previous client to server request has completed or further additional connections need to be established. This is a problem for realtime interactive applications that want to offer the best possible latency and performance.

A solid solution for apps where data needs to be instantly pushed from client to server, where the freshness of data is important. Data displays, dashboards, realtime maps etc. are good fits. HTTP Streaming  suffers the same problems as HTTP Long-Polling when it comes to client to server communication so use cases like multiplayer games and truly interactive collaborative experiences.

And this is where WebSocket wins out.

### WebSocket

WebSocket perfectly suits increasingly interactive functionality and higher frequency bi-directional communication as you really start to see the benefits of low latency, efficiency and small payloads.

The bi-directional connectivity also starts to be highly important as we can use a single connection per client to do the majority of our message passing. And this is clearly much more efficient than multiple HTTP connections. 

If your data doesn't update all that frequently then maintaining your own infrastructure to support WebSocket is probably an overhead. However, as soon as the frequency of data increases and the experiences become interactive WebSocket shines. Data displays, highly active chat, fast moving activity streams, collaborative experiences, second screen experiences that need to stay in sync, collaborative apps and multiplayer games all massively benefit from what WebSocket has to offer.

#### Note: It's not just user-driven interactions

WebSocket is essential where bi-directional communication is required. The initial thought is obviously that this is user driven interaction - and until now I've done nothing to say otherwise. However, that's not always the case. It could be that your solution requires a relative interactive protocol e.g. for updating data subscriptions. Again, WebSocket is the best solution for this.

### HTTP Polling v HTTP Long-Polling v HTTP Streaming v WebSocket

To summarise, here's a comparison of where I see each of the realtime connection transports fitting.


<table class="default"><thead>
<tr>
<th>Transport</th>
<th>Suitable Message Frequency</th>
<th>Bi-directional Communication</th>
<th>Message Latency</th>
<th>Connection Efficiency</th>
<th>User Experience</th>
</tr>
</thead><tbody>
<tr>
<td><em>HTTP Polling</em></td>
<td>Low</td>
<td>No</td>
<td>High</td>
<td>Low</td>
<td>Fine at low message frequency</td>
</tr>
<tr>
<td><em>HTTP Long-Polling</em></td>
<td>Medium</td>
<td>No</td>
<td>Medium</td>
<td>Medium</td>
<td>Fine at medium message frequency</td>
</tr>
<tr>
<td><em>HTTP Streaming</em></td>
<td>High</td>
<td>No</td>
<td>Low</td>
<td>High</td>
<td>Good for received data. Average for interactive experiences</td>
</tr>
<tr>
<td><em>WebSocket</em></td>
<td>High</td>
<td>Yes</td>
<td>Low</td>
<td>High</td>
<td>Good for both receiving data and interactive experiences</td>
</tr>
</tbody></table>

You can also look at suitability in terms of well-known applications that you'll be able to map to their common use cases:

<table class="default"><thead>
<tr>
<th>Scenario</th>
<th>HTTP Polling</th>
<th>HTTP Long-Polling</th>
<th>HTTP Streaming</th>
<th>WebSocket</th>
</tr>
</thead><tbody>
<tr>
<td>Facebook Wall</td>
<td>Low</td>
<td>Medium</td>
<td>High</td>
<td>High</td>
</tr>
<tr>
<td>Twitter User Stream</td>
<td>Low</td>
<td>Medium</td>
<td>High</td>
<td>High</td>
</tr>
<tr>
<td>Uber Taxi Tracking</td>
<td>Low</td>
<td>Medium</td>
<td>High</td>
<td>High</td>
</tr>
<tr>
<td>Google Realtime Analytics</td>
<td>Low</td>
<td>Medium</td>
<td>High</td>
<td>High</td>
</tr>
<tr>
<td>WhatsApp</td>
<td>No</td>
<td>Low</td>
<td>Medium</td>
<td>High</td>
</tr>
<tr>
<td>Google Docs</td>
<td>No</td>
<td>Low</td>
<td>Medium</td>
<td>High</td>
</tr>
<tr>
<td>QuizUp (Multiplayer games)</td>
<td>No</td>
<td>Low</td>
<td>Low</td>
<td>High</td>
</tr>
</tbody></table>

## WebSocket Everywhere!

My - hopefully informed - opinion is that WebSocket is by far the best realtime connection transport. If it weren't for problems with legacy browsers, firewalls and proxies WebSocket would be the *only* realtime transport that we would need for use case where realtime really matters. We're not all that far from making that possible. Based on the stats that Pusher has this means 90% of connections use WebSocket and the rest use either Flash WebSocket emulation or HTTP.

I'm always open to opinion and feedback on all of this. I'm more than willing to change my opinion based on solid arguments - believe it or not it took time for me to be convinced about the benefits of WebSocket. So, if you've any questions then please don't hesitate to [get in touch](mailto:phil@leggetter.co.uk).

<a name="additional_reading"></a>
## Additional reading

* [Ilya Grigorik's High Performance Browser Networking HTTP 1.X chapter](http://chimera.labs.oreilly.com/books/1230000000545/ch11.html)
* [WebSockets protocol vs HTTP on StackOverflow](http://stackoverflow.com/a/14711517/39904)
* [HTML5 Web Sockets:
A Quantum Leap in Scalability for the Web](http://www.websocket.org/quantum.html)
* [Long-Polling doesn't totally suck](http://blog.fanout.io/2013/03/04/long-polling-doesnt-totally-suck/)
* [Realtime Web Technology Guide](https://www.leggetter.co.uk/real-time-web-technologies-guide)
* [Choosing Your Realtime Web App Technology Stack](https://www.leggetter.co.uk/2013/12/09/choosing-realtime-web-app-tech-stack.html)

---
layout: post
status: publish
published: true
title: "History, Background, Benefits & Use Cases of Realtime"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
wordpress_id: 24039
wordpress_url: "https://www.leggetter.co.uk/?p=24039"
date: "2013-10-28 12:36:22 +0000"
date_gmt: "2013-10-28 12:36:22 +0000"
categories:
  - Technology
tags:
  - realtime
  - realtime web
  - talks
  - FOWA
  - FOWA 2013
  - future of web apps
permalink: /2013/10/28/history-background-benefits-use-cases-realtime.html
thumb: /images/thumb/web-communication.png
---

<p>This is part 1 of a 3 part series on <strong>Choosing your Realtime Web App Tech Stack</strong>. It's based on the talk I recently gave at the Future of Web Apps.</p>

<ul>
<li>Part 2: <a href="/2013/10/31/fundamentals-realtime-web-realtime-web-functionality.html">Fundamentals of the Realtime Web &amp; Realtime Web Functionality</a></li>
<li>Part 3: <a href="/2013/12/09/choosing-realtime-web-app-tech-stack.html">Choosing your Realtime Web App Tech Stack</a></li>
</ul>
<p>For some time I've seen FOWA as one of the biggest web conferences around. So, when Future Insights approached me to talk at <a href="http://futureofwebapps.com/london-2013/">FOWA 2013</a> I was very excited (and nervous). Now that the event has been and gone I'm pleased to say that both the event and my talk went well.</p>
<p>Since <a href="/2013/07/04/leaving-pusher-what-next.html">leaving Pusher</a> I've kept a keen eye on the realtime web tech scene. And since I'm now unaffiliated to one realtime company (although I have to admit I've still a soft spot for Pusher) I can now be even more open about other technologies and how they compare (I do like to think I was always very open and honest anyway).</p>
<p>Below you can find a summary of my FOWA 2013 talk. If you simply want to dive into the slides you can find them <a href="http://leggetter.github.io/talks/realtime-tech-stack/">here</a>.</p>
<p><img src="/wp-content/uploads/2013/10/choosing-your-realtime-web-app-tech-stack.png" alt="" /></p>
<p>A talk on <strong>Choosing your Realtime Web App Tech Stack</strong> seemed an appropriate way to both demonstrate that and share some of the knowledge I've aquired since working in and around realtime web tech since 2001.</p>
<p><img src="/wp-content/uploads/2013/10/web-communication.png" alt="" /></p>
<p>In 1991 the first documented version of HTTP was released. HTTP is a <a href="http://en.wikipedia.org/wiki/Request-response">request-response</a> protocol where a client initiates a connection and request for data, the server responds and the connection is closed.</p>
<p>To achieve realtime web communication a connection needs to be maintained so that if either side of that connection has new data it can instantly be sent to the other party.</p>
<p>It wasn't until 1996 that it became possible to create a persistent client-server connection in a web browser <a href="http://en.wikipedia.org/wiki/Comet_&#40;programming&#41;#Early_Java_applets">with the help of a Java Applet</a>.</p>
<p>However, Java Applets never really become a popular - or viable choice - due to a <a href="http://www.javaworld.com/jw-10-1997/jw-10-lawsuit.html">lawsuit</a>, generally flakey Sun JVM <a href="http://en.wikipedia.org/wiki/LiveConnect">LiveConnect</a> implementation and a general resistence for a requirement on browser plugins.</p>
<p>As ever, developer needs prevailed and around 2000 we managed to hack some purely native web-browser solutions using persistent HTTP connections.</p>
<p><img src="/wp-content/uploads/2013/10/is-the-realtime-web-a-threat-to-google-search.png" alt="" /></p>
<p>So, realtime web technologies have been around since 2000 where it was primarily used by companies either in, or targeting, finance. But it wasn't until a number of years later that the use of the technology went mainstream.</p>
<p>In 2009 <a href="http://scobleizer.com/about/">Robert Scoble</a> wrote a blog post asking <a href="http://scobleizer.com/2009/02/09/is-the-real-time-web-a-threat-to-google-search/">"Is the real-time web a thread to Google search?"</a> At that time he was using a service called <a href="http://friendfeed.com/">FriendFeed</a> and was very excited that as soon as he posted information on the network that it was <strong>instantly discoverable</strong> through search.</p>
<p>Back in 2009 we were all quite used to waiting days for our new online content to be discovereable. We would post a blog post, or create a new website and wait days for search engines like Google to find out content.</p>
<blockquote>
<p>Let’s do a search for anyone who has written about the Canon 5D MK II but lets constrain that to posts that have at least one like and at least four comments. […] Note that the post I wrote just one minute ago is already in the results page. This is the real-time web.</p>
</blockquote>
<p>FriendFeed's functionality suggested that this no longer had to be the case; that the realtime web was going to change all that. Ok, this wasn't to the same scale as Google, but it was to a reasonable scale.</p>
<p>Back then, even <a href="http://blog.caplin.com/2009/04/20/what-is-the-real-time-web/">Wikipedia had no definition for "real-time web"</a>. The <a href="/2009/07/09/wikipedia-now-has-a-definition-for-real-time-web.html">first definition</a> was added in mid-2009 and was search-focused.</p>
<p><img src="/wp-content/uploads/2013/10/realtime-web-wikipedia-definition.png" alt="" /></p>
<p>Now, however the definition is very much focused on the <strong>Instant Delivery of Data</strong>.</p>
<p><img src="/wp-content/uploads/2013/10/instant-delivery-of-data.png" alt="" /></p>
<p>This has been partly enabled by social networks' ability to know who is interested in data. We now:</p>
<ul>
<li>Follow people on Twitter</li>
<li>Friend people on Facebook</li>
<li>Add people to Circles on Google+</li>
</ul>
<p>All of these represent a data subscription to updates and posts. This means these social networks know what data we are interested in so as soon as it's available it can be delivered to us. This type of functionality is ideal for realtime web technology.</p>
<p><img src="/wp-content/uploads/2013/10/its-not-really-realtime.png" alt="" /></p>
<p>You shouldn't use this technology to control the safety system in your neuclear power station. Nor should you use it to control the breaks in your car. But it's perfectly capable of being used to send data in less than 300ms. I have benchmarks that show that you can get the average lower than 100ms. So, we're talking "soft realtime".</p>
<p><img src="/wp-content/uploads/2013/10/data-timely-manner-context.png" alt="" /></p>
<p>What is very important is that the time between the data being generated and it being delivered needs to be small enough for data to maintain its relevance.</p>
<p>If the data isn't delivered within a timely manner it has the potential of losing relevance and context. Realtime web technologies actually enable you to instantly deliver data and therefore maintain context. <strong>I think the fact that realtime technology can help you maintain context is going to be a big factor in the technology is going to be increasingly important</strong>.</p>
<p><img src="/wp-content/uploads/2013/10/benefits-use-cases-realtime.png" alt="" /></p>
<p>What are the benefits that realtime enable and how is this technology being used right now? Here are a few areas where I believe realtime is important along with a few examples where the technology is being used and making a difference.</p>
<p><img src="/wp-content/uploads/2013/10/push-equals-convenience.png" alt="" /></p>
<p>The fact that you can push information to those that have registered interest is <em>convenient</em>.</p>
<p>It's a bit of a silly example, but: if you had to open a phone or SMS application and keep hitting a button to see if you can any incoming phone calls or SMS messages that really wouldn't be convenient.</p>
<p>The same therefore goes for data within applications; as new information becomes available or some other call to action is available (e.g. phone rings -> pick up the phone) then the user should be made aware.</p>
<p>Realtime Web Tech makes this a possiblity in web and mobile applications.</p>
<p><img src="/wp-content/uploads/2013/10/itv-news-realtime-notifications.png" alt="" /></p>
<p>The first and simplest example of using Realtime technology is <a href="http://www.itv.com/news">ITV News</a>. Around a year ago they had a site redesign and moved towards an <strong>Activity Stream</strong> look and feel. Along with this they added realtime content delivery and notifications. The content isn't instantly displayed. Instead a notification is shown to say the new content is available; when the notification it slides in.</p>
<p>While this may not be the most innovative use of realtime technology it has worked. Around 6 months ago I was told that the site redesign, along with this realtime functionality, resulted in a 10-fold increase in site traffic.</p>
<p>ITV News has become a destination for <strong>realtime news</strong>.</p>
<p><img src="/wp-content/uploads/2013/10/man-city-2nd-screen.png" alt="" /></p>
<p>Manchester City released a <a href="http://www.aqueduct.co.uk/a-new-season-a-new-mcfc-match-day-centre/">Match Day Centre</a> application at the start of the season. It shows <strong>realtime stats</strong> about an in-play game. I used to love <a href="http://en.wikipedia.org/wiki/Championship_Manager_series">Championship Manager</a> and Football Manager style games so I really get this. I even created a <a href="https://plus.google.com/115842503466861231289/posts/TofYhpk2WkD">demo for Opta Sports</a> when I was working on the <a href="/tag/kwwika">Kwwika</a> project that looked very similar to this.</p>
<p>I believe this is a great example of a <strong>2nd Screen Experience</strong> that offers lots of value. It really complements watching a live game - you just can't integrate all that data into the main screen. It's also really valuable standalone.</p>
<p><img src="/wp-content/uploads/2013/10/realtime-google-analytics.png" alt="" /></p>
<p>As most of us know, Google Analytics has a realtime option. But is this just a marketing gimmick? What real value does this offer?</p>
<p>When we publish new content it's great to see the reaction that the content is getting, what traffic it's resulting in and where that traffic is coming from. <em>And that's the real value and opportunity here</em>.</p>
<p>If you see a lot of traffic coming from a destination, or for a particular keyword, the <strong>opportunity</strong> that realtime gives you is to be able to <strong>react</strong> to that realtime information. You can tweak your content to get better conversions and to take advantage of the unexpected traffic.</p>
<p>If you see the traffic drop you can <strong>react</strong> by looking at your server stats to check CPU, memory and disk usage.</p>
<p><img src="/wp-content/uploads/2013/10/speed-equals-opportunity.png" alt="" /></p>
<p>The speed at which you can deliver information, and the speed at which you receive information, presents both the product or service provider (you) and the user with <strong>opportunity</strong>.</p>
<p><img src="/wp-content/uploads/2013/10/foursquare-realtime-checkin-notification.png" alt="" /></p>
<p>A simple example of the how realtime enables opportunity is one provided by FourSquare. If I check-in to a coffee shop and a friend happens to be near-by they will get a notification. We therefore have the opportunity of catching up over a coffee. If I've never actually met that friend in person before (that happens a lot nowadays) then we get the opportunity to finally meet up in person. Who knows what will come from that meetup?</p>
<p><strong>I love the serendipitous nature of this.</strong></p>
<p><img src="/wp-content/uploads/2013/10/caplin-trader-the-evolution-of-realtime.png" alt="" /></p>
<p>Back in 2001 I joined <a href="http://www.caplin.com">Caplin Systems</a> as a university graduate. They were one of the pioneers of realtime web technology, focusing on providing realtime web technology to financial organisations.</p>
<p>The thing that makes their flagship front-end products - now <a href="http://www.caplin.com/caplin-trader">Caplin Trader</a> - interesting is how they have evolved. Initially the focus was on enabling realtime in-browser data displays to financial organisations where realtime data really makes a difference; milliseconds can make a difference between lots of money made or lost. Now the focus is firmly on enabling realtime interactions with trading systems and traders - actually executing trades and realtime communication within a web trading front-end.</p>
<p>This demonstrates - for me - the most exciting use of the technology right now. <strong>Enabling realtime communication and interaction</strong>.</p>
<p><img src="/wp-content/uploads/2013/10/interaction-equals-engagement.png" alt="" /></p>
<p>Twitter, Facebook, Google+ and many other platforms are successful because they are <strong>communication platforms</strong>. When we publish a tweet or a status update we don't do that in the hope that we're ignored. We do so in the hope that our update will be retweeted, favourited, replied-to or liked; that it will start some for of interactive communication experience.</p>
<p>When we interact in an application we engage with it, we spend a lot more time using it. From an application creators point of view this is massively important.</p>
<p><strong>Realtime Web Technologies enable us to create interactive and engaging functionality within our applications</strong>.</p>
<p><img src="/wp-content/uploads/2013/10/jabbr-realtime-chat.png" alt="" /></p>
<p>When it comes to trying out realtime web tech you'll probably start by building a chat application. <a href="http://about.jabbr.net/">Jabbr</a> is one example.</p>
<p>We probably all use chat applications on a daily basis. So, we understand their value. Realtime web technologies make building chat functionalty really easy so we can integrate similar functionality into any application and start to get the benefit directly in our apps.</p>
<p><img src="/wp-content/uploads/2013/10/google-docs-realtime-collaboration.png" alt="" /></p>
<p><strong>Collaboration</strong> is probably the area of communication where I'm most excited to see this technology used. We have some great examples of uses now, but I think we're going to see a lot of innovation in this space.</p>
<p>Most of use have used Google Docs before. It's a great product and saves us a tonne of time. How did we used to collaborate on docs previously?</p>
<ol>
<li>Write initial document draft</li>
<li>Add to Share Point (oh dear!) or email it as an attachment to single collaborator</li>
<li>Collaborator turns on Track Changes and edits doc</li>
<li>Wait for review to be checked back in to Share Point or emailed</li>
<li>Make updates based on review and back to 1. again.</li>
</ol>
<p>This could eat up a whole lot of time. The process is now:</p>
<ol>
<li>Write initial document draft</li>
<li>Invite collaborators, edit and dicuss in realtime</li>
</ol>
<p>How many hours or days does this save?</p>
<p><img src="/wp-content/uploads/2013/10/cloud9-ide-realtime-coding-collabroation.png" alt="" /></p>
<p>We can take this experience to coding. In this case we have <a href="https://c9.io/">Cloud 9 IDE</a>, an in-browser collaborative code editor. Using C9 we can have multiple developers editing and discussing code, and we can also jump into a <strong>collaborative debugging session</strong>.</p>
<p><img src="/wp-content/uploads/2013/10/murally-realtime-murals.png" alt="" /></p>
<p>Finally, we can take an experience which usually requires physical space - think whiteboarding. Murally offer an app that lets multiple users collaborate on large open murals where you can bring in text, pictures and annotations. A great way of exploring and fleshing out ideas.</p>
<p><img src="/wp-content/uploads/2013/10/realtime-use-case-summary.png" alt="" /></p>
<p>There are many uses of realtime technology but the most common use cases are live content, notifications, activity streams, chat, collaborative experience and games.</p>
<p>As we start to innovate futher I'm sure this list will continue to expand - I didn't even touch on the <strong>Internet of Things where realtime web tech is going to be massively important</strong>.</p>
<h2>Next: Fundamentals of Realtime and Realtime Functionality</h2>
<p>That's it for part 1. In part 2 I'll cover the fundamentals of realtime and realtime functionality. Finally, in part 3 I'll cover 5 points that you should consider when <strong>Choosing your Realtime Web App Tech Stack</strong>.</p>

---
layout: post
status: publish
published: true
title: How I won the ESRI DevSummit 100 lines of JavaScript competition
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 23703
wordpress_url: "http://www.leggetter.co.uk/?p=23703"
date: "2013-03-29 14:45:15 +0000"
date_gmt: "2013-03-29 14:45:15 +0000"
categories:
  - Technology
  - thoughts
tags:
  - JavaScript
  - ESRI
  - devsummit
  - developer summit
  - firebase
  - angularjs
  - arcgis javascript
permalink: /2013/03/29/how-i-won-the-esri-devsummit-100-lines-of-javascript-competition.html
thumb: /images/thumb/realtime-global-collaboration.jpg
---

<p><em>First I'd like to emphasise that this is a blog post on <strong>how</strong> and <strong>not why</strong>. The why comes down to the judges. So, thanks Judges! Secondly I'd like to thank <a href="https://twitter.com/robdunfey">Rob Dunfey</a> for the idea and for providing additional motivation - I'll dig deeper into this later. Finally: what am I going to cover? As the title suggests, I want to cover the <strong>how</strong>.</em></p>

<p>What that means is:</p>

<ol>
<li><em>The Idea</em></li>
<li><em>Solving a Real Problem</em></li>
<li><em>The Motivation</em></li>
<li><em>A Developer's Toolbox?</em></li>
<li><em>My Developer's Toolbox - How the Realtime Collaborative Mapping app was built</em></li>
<li><em>What has been achieved?</em></li>
<li><em>Where next?</em></li>
</ol>
<h3>The Idea</h3>
<p class="alignright size-full"><img src="/wp-content/uploads/2013/03/robs-brain-287x300.jpg" alt="Rob&#039;s Brain" width="287" height="300" class="size-medium wp-image-23711" /><br />Rob's Brain</p>
<p>I've been friends with <a href="https://twitter.com/robdunfey">Rob Dunfey</a> ever since I worked at ESRI back in 2005. When I worked there my job title became "GIS Consultant" but if I'm honest I was really only ever a Web Developer (<em>that's not a bad thing</em>). Since then we've worked on a couple of projects together - Rob now works as a Geo-Information Consultant at Shell and I'm a "Developer Evangelist" at <a href="http://pusher.com">Pusher</a>. I'm following my passion for <a href="/real-time-web-technologies-guide">Realtime Web Technologies</a> and web development, and Rob is following his passion for GIS.</p>
<p>However, we do infrequently work on projects together and, to be honest, it's sometimes quite difficult to get Rob to slow down with his ideas about using GIS to solve real problems. One of the things he also sees is the opportunity to use web technologies to solve those problems.</p>
<p>So, two weeks ago Rob got in touch with me - <em>not to discuss his impending wedding on Monday</em> - but to tell me about the <a href="https://github.com/Esri/100-lines-or-less-js">100 Lines or Less ArcGIS JavaScript Code Challenge</a>!</p>
<h3>Solving Real Problem</h3>
<p>Rob said:</p>
<blockquote>
<p>Frequently we encounter a business problem that requires a solution enabling multiple colleagues capture information on a map at the same time, in a dynamic fashion.  One such use case may be a workshop event, where you want to capture locations favoured by attendees - you could try that at the Palm Springs dev summit, if you ask attendees to mark up a map with their home location, all done real time, allowing the conversation to develop around the map edits - real time.</p>
</blockquote>
<p>If you've seen the <a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/README.md">README</a> for my <a href="http://esri.github.com/100-lines-or-less-js/realtime-collaborative-mapping/index.html">Realtime Collaborative Mapping</a> entry you'll notice that the introductory paragraph is almost identical to this.</p>
<p>The ability to collaboratively edit a map in realtime had clearly been identified as something that people really want - and need - to do: A problem that needed to be solved.</p>
<p><strong>Could this be done in 100 lines of JavaScript or less?</strong> Yes.</p>
<h3>The Motivation</h3>
<p><img src="/wp-content/uploads/2013/03/2-person-collaboration-300x286.jpg" alt="2-person-collaboration" width="300" height="286" class="alignright size-medium wp-image-23737" /></p>
<p>To succeed at something it's important to be motivated. I'd like to think that in this case the motivation behind the <a href="http://esri.github.com/100-lines-or-less-js/realtime-collaborative-mapping/index.html">Realtime Collaborative Mapping application</a> really helped ensure that the result was successful.</p>
<p>If you combine my knowledge of realtime web technologies with Rob's knowledge of GIS then the most obvious use case is a realtime collaborative mapping application. So, we've been discussing this idea for quite some time. This competition was the perfect platform to <span style="text-decoration: line-through;">get Rob off my back</span> <strong>prove that the idea we've been bouncing around for months could be achieved</strong>.</p>
<p>And not only could it be achieved it <strong>could be done in 100 lines of JavaScript or less</strong>.</p>
<p>Finally, I've been working with realtime web technologies for over 10 years now and I saw this as a great opportunity to <strong>demonstrate the power of realtime web technologies</strong>. And to demonstrate that <strong>using realtime web technologies is really easy</strong>.</p>
<h3>A Developer's Toolbox?</h3>
<p><a href="/wp-content/uploads/2013/03/toolbox3.jpg"><img src="/wp-content/uploads/2013/03/toolbox3-262x300.jpg" alt="Developer&#039;s Toolbox" width="262" height="300" class="alignright size-medium wp-image-23710" /></a></p>
<p>The role of a developer has changed quite a bit since I graduated with a Software Engineering degree in 2001. Up until I joined Pusher my role was primarily a Software Engineer attempting to follow what the industry defined as "best practice"; first documentation through to development (the waterfall model), then an increased focus on testing, which continued with the introduction of agile in the form of Extreme Programming (XP), SCRUM, Kanban etc.</p>
<p>The reason that things changed when I joined Pusher wasn't because the development team don't follow those best practices (or their own incarnation of them) - they do. It's because I <strong>started to attend hackathons</strong> where the focus is creating something functional - ideally with a <strong>wow factor</strong> - within a short space of time.</p>
<p>The teams that tend to win such events aren't necessarily the best software engineers, but are those that have a <strong>developer toolbox</strong> that they can look through when they are trying to solve a problem.</p>
<p>A knowledge of a programming language isn't simply an understanding of syntax and structure; it also covers a knowledge of the libraries and extensions that are available as part of the technology runtime. A developer toolbox goes beyond an understanding of a development runtime. It extends to:</p>
<ol>
<li><strong>Productivity tools</strong>: Development environments (editors, IDEs, OS tooling, testing, profiling, debugging and hardware)</li>
<li><strong>Application runtimes and frameworks</strong>: for web development where you <em>probably</em> (see point 4) need a web server and a database this is important. Your developer toolbox should contain these already setup up and ready to go. Or provide ways of quickly doing so.</li>
<li><strong>3rd party libraries</strong>: if a problem has already been solved by a library then use it</li>
<li><strong>A knowledge of APIs and hosted services</strong>: By knowing what APIs and hosted services are available you can quickly uses these tools to achieve things that would otherwise take you hours to weeks to achieve.</li>
</ol>
<p>Hosted services - which offer APIs - actually combine productivity tools, application runtimes &amp; frameworks and the functionality offered by 3rd party libraries. This makes them amazingly powerful and, I'd argue, are becoming the most important tools in a developer toolbox.</p>
<h3>My Developer Toolbox - How the Realtime Collaborative Mapping app was built</h3>
<p><img src="/wp-content/uploads/2013/03/realtime-global-collaboration1.jpg" alt="Realtime Global Collaboration" width="1000" height="714" class="alignright size-full wp-image-23709" /></p>
<p>For the Realtime Collaborative Mapping application I used the following tools from my developer toolbox:</p>
<ul>
<li>The <a href="http://help.arcgis.com/en/webapi/javascript/arcgis/">ArcGIS API for JavaScript</a> - obviously.</li>
<li><a href="http://angularjs.org/">Angular JS</a> as a JavaScript web application framework. I used it for routing and data binding.</li>
<li><a href="http://firebase.com">Firebase</a> for realtime synchronisation of data (graphics) between users.</li>
</ul>
<p><em>Note: Why didn't I use <a href="http://pusher.com">Pusher</a>? Since I work for Pusher I use the Pusher API all the time. I saw this as an opportunity to use another API that I knew about but hadn't had a chance to really dig into. I also saw the application I was building as needing realtime data synchronisation with persistence which we (Pusher) don't presently offer - our focus is realtime messaging with integration into existing web stacks. This would have been achievable with Pusher but I would have needed a few more lines of JavaScript code to do so.</em></p>
<p>I chose these tools because the application was to be built using front-end web technologies with a heavy focus on JavaScript.</p>
<h4>ArcGIS API for JavaScript</h4>
<p>My usage of the ArcGIS API for JavaScript was really simple:</p>
<ul>
<li><a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/js/ArcGIS.js#L46">Create a map</a> using a webmap ID</li>
<li>Add a <a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/js/ArcGIS.js#L56">drawing toolbar</a> to the map</li>
<li><a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/js/ArcGIS.js#L69">Add a graphic</a> too the map when the user draws one and <a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/js/ArcGIS.js#L81">remove a graphic</a> when required too</li>
</ul>
<h4>Angular JS</h4>
<p>The <a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/js/ArcGIS.js#L6">routing part</a> was really simple. I needed:</p>
<ul>
<li>a landing page where users could enter an existing webmap ID, or choose from some pre-selected ones.</li>
<li>a map view which would have the webmap ID in the URL for easy sharing, show the selected webmap and let a user draw graphics on the map</li>
</ul>
<p>Angular JS also provides a mechanism for exposing properties which offer two-way data binding. I used this to expose:</p>
<ul>
<li>The <a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/js/ArcGIS.js#L21">share URL</a></li>
<li>An <a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/js/ArcGIS.js#L22">encoded version</a> of the share URL</li>
<li>The <a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/js/ArcGIS.js#L31">type of drawing</a> that the user had selected in the <a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/views/map.html#L2-L39">toolbar view</a>.</li>
</ul>
<h4>Firebase</h4>
<p>My use of Firebase goes to show just how easy it is to add realtime functionality to web applications using a realtime web hosted service. I used Firebase to persist and share the graphics data between all users who were viewing the same map.</p>
<ul>
<li><a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/js/ArcGIS.js#L74">Connect to Firebase</a> and identify where the data for my app is to be stored within my "collaborative mapping" Firebase app. I appended a webmap ID so that all data associated with a given map would be shared. I could have appended another unique ID so that groups could share privately</li>
<li>I bound to <a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/js/ArcGIS.js#L75-L78"><code>child_added</code> and <code>child_removed</code> events</a> so the app knew when a new graphic had been added or an existing one removed</li>
<li>I used Firebase as a model for the graphics on my map. What this meant is whenever a new graphic was added I simply <a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/js/ArcGIS.js#L58">added it to Firebase</a> and the added code was called. The really clever bit is that the code was not only called within the app of the user who added the graphic but <strong>also within the app for all other users who were view the same map</strong>.</li>
<li>When a user clicked the <a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/views/map.html#L36">Clear All button</a> I prompted the user for confirmation and then <a href="https://github.com/Esri/100-lines-or-less-js/blob/master/realtime-collaborative-mapping/js/ArcGIS.js#L58">removed the webmap node</a> from Firebase. In a real app I'd use <a href="https://www.firebase.com/docs/security-quickstart.html">Firebase security</a> to restrict who was allowed to execute such a function.</li>
</ul>
<p>I've supplied quite a bit of detail here. But this all actually only equates to the code using the Firebase object 5 times. Wow! <strong>5 lines of code to convert a web application into a realtime collaborative web app</strong> - realtime web technology really is powerful!</p>
<h3>What has been achieved?</h3>
<p>Ok, I've won the competition - which is awesome! Thanks, ESRI. What I'm also hoping has been achieved is that by creating the application and writing this is blog post I've demonstrated:</p>
<ol>
<li>The <strong>power of realtime web technologies</strong> - with <em>5 lines of code</em> I've made an application support multiple simultaneous users and collaborative. This means that anybody in the world with a web browser and an Internet connection can collaborate on a map with anybody else.</li>
<li>How <strong>using a hosted service + API to add amazing functionality in fraction of the time</strong> and effort it would take to write this all myself.</li>
<li>The importance of a having a well equipped <strong>Developer Toolbox</strong> - I hope this has got you thinking about what's in your Developer Toolbox. I'm sure the <a href="http://www.esri.com/events/devsummit">ESRI DevSummit</a> has given you more tools to add to your toolbox arsenal, and it's important that you continue to improve what's in there by attending events, reading up on technology and trying things yourself (maybe at hackdays).</li>
<li>Finally - something I'm really excited about - is how it's now easier than ever to use a <strong>fusion of technologies to create very powerful applications on the web</strong>. The Google Maps API launched in 2005 (whilst I was at ESRI) and if the ArcGIS API for JavaScript had been about who knows what I'd be doing now. I'm not a GIS developer, but I understand the power of GIS so I can't wait to see GIS appear in more applications. See <a href="http://tweetmap.it/">TweetMap</a> and <a href="http://rawkes.com/articles/vizicities-dev-diary-1">ViziCities</a> as some exciting examples.</li>
</ol>
<h3>Where next?</h3>
<p>I'd really like some feedback on the application. I'd also like people to <a href="https://github.com/Esri/100-lines-or-less-js">fork the application</a> and go beyond the 100 lines of JavaScript (it is a bit messy) and change it into a real application - <strong>it does have real potential</strong>.</p>
<blockquote class="twitter-tweet" data-cards="hidden" align="center"><p>Congratulations to Phil Leggetter, winner of the ArcGIS JavaScript code challenge!<a href="https://twitter.com/search/%23devsummit">#devsummit</a>. <a href="http://t.co/VIiTXfJE1Q" title="http://po.st/BcnnTp">po.st/BcnnTp</a></p>
<p>&mdash; Esri DevSummit (@EsriDevSummit) <a href="https://twitter.com/EsriDevSummit/status/317418932040527872">March 28, 2013</a></p></blockquote>
<p><script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script></p>
<p>I also need to look into how I'm going to get to Palm Springs for the ESRI International Developer Summit in 2014. <strong>Maybe I could propose a talk about how I built the Realtime Collaborative Mapping application and get some costs covered?</strong></p>
<p>Hopefully I'll see you at the ESRI Developer Summit in 2014!</p>

---
layout: post
status: publish
published: true
title: Windows Azure Mobile Services Realtime Collaborative To Do App
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 23749
wordpress_url: "http://www.leggetter.co.uk/?p=23749"
date: "2013-04-09 15:18:14 +0100"
date_gmt: "2013-04-09 14:18:14 +0100"
categories:
  - Technology
tags:
  - realtime
  - pusher
  - Windows Azure Mobile Services
  - Window Azure Web Sites
permalink: /2013/04/09/windows-mobile-service-realtime-collaborative-todo.html
---

<p>Inspired by the first two talks at <a href="http://stacked.thestack.co.uk/">#stacked13</a> by <a href="https://twitter.com/mtaulty">Mike Taulty</a> and then <a href="https://twitter.com/maartenballiauw">Maarten Balliauw</a> I thought I'd jump straight into Windows Azure Mobile Services and build an a <strong>realtime collaborative synchronised todo list</strong>. I'd do this based on the <a href="http://www.windowsazure.com/en-us/develop/mobile/tutorials/get-started-with-data-html/">Get started with data in Mobile Services HTML guide</a>. I would then and host it on a <a href="http://www.windowsazure.com/en-us/home/scenarios/web-sites/">Windows Azure web site</a>.</p>
<p><strong>Update: <em>Sorry, I haven't renewed my Azure Mobile Services account so the demo is no longer available</em></strong></p>
<p><img src="/wp-content/uploads/2013/04/realtime-todo.png" alt="realtime-todo" width="800" height="357" class="aligncenter size-full wp-image-23756" /></p>
<p style="text-decoration: line-through">View the demo</p>
<p><em>Note: I want to publish this quite quickly so that people at the event can have a play. So, the rest of this post will be a bit of a brain dump and I'll tidy it up later</em></p>
<h3>HTML/JavaScript Mobile Services To Do list</h3>
<p>In Mike's talk he mentioned that the mobile service JavaScript library has just been released. So, this was an obvious starting point. Signing up for Azure and following the <a href="http://www.windowsazure.com/en-us/develop/mobile/tutorials/get-started-with-data-html/">getting started</a> guide was very simple.</p>
<p>You can see the code following the tutorial, with a bit of clean up, <a href="https://github.com/leggetter/pusher-azure-todo/tree/bf07e3c0ec944f5ed74096cc1d748f5e26cd5cda">here</a>. The main files to look at are <a href="https://github.com/leggetter/pusher-azure-todo/blob/bf07e3c0ec944f5ed74096cc1d748f5e26cd5cda/index.html">index.html</a> and <a href="https://github.com/leggetter/pusher-azure-todo/blob/bf07e3c0ec944f5ed74096cc1d748f5e26cd5cda/app.js">app.js</a>.</p>
<h3>Making it realtime with Pusher</h3>
<p><a href="http://pusher.com">Pusher</a> (who I work for) are <a href="http://www.windowsazure.com/en-us/store/service/?id=70e4389b-739e-4c8a-9af2-411fb11b895a">listed in the Windows Azure store</a>. So, the first thing to do is add Pusher as an add-on.</p>
<p><img src="/wp-content/uploads/2013/04/pusher-azure-addon-e1365510019790.png" alt="pusher-azure-addon" width="997" height="665" class="aligncenter size-full wp-image-23750" /></p>
<p>Once the addon has been created you go to the Pusher Dashboard and grab your application credentials from the already created "Azure" application.</p>
<p><img src="/wp-content/uploads/2013/04/pusher-api-access.png" alt="pusher-api-access" width="830" height="357" class="aligncenter size-full wp-image-23753" /></p>
<p>Once I had the Pusher addon ready and my credentials I could jump into data scripts and so that <strong>any changes to the todo list could instantly be broadcast to anybody else viewing the list</strong>.</p>
<p>The code for this is unbelievably simple. The fact the <em>insert</em>, <em>update</em> and <em>delete</em> scripts are all separate makes things a bit repetitive, but ultimately you can broadcast the change events in just a few lines of code.</p>
<h3>Broadcasting C<span style="text-decoration: line-through;">R</span>UD Trigger events</h3>
<p><img src="/wp-content/uploads/2013/04/pusher-insert-1024x639.png" alt="pusher-insert" width="1024" height="639" class="aligncenter size-large wp-image-23762" /></p>
<p>The first thing that we do in the script is include the <a href="https://github.com/pusher/pusher-node-server">pusher-node-server library</a> which Microsoft have made available because Pusher is in the Windows Azure Store.</p>
<p>We then create a new <code>Pusher</code> instance and provide it with our credentials.</p>
<p>After that we let the <code>INSERT</code> complete and if it is successful we trigger an event on a <a href="http://pusher.com/docs/channels">channel</a> to broadcast that a new todo list item has been created. The first parameter here is the name of the channel, the second the name of the event (what happened) and the third is the data payload. You also need to wait for the request to complete in order for the <code>item</code> to have an <code>id</code> property.</p>
<p>Adding <code>UPDATE</code> and <code>DELETE</code> scripts were just as easy.</p>
<p><img src="/wp-content/uploads/2013/04/pusher-update-1024x640.png" alt="pusher-update" width="1024" height="640" class="aligncenter size-large wp-image-23763" /></p>
<p>The <code>item</code> in the <code>UPDATE</code> script only has the changed properties. I had to modify my front-end JavaScript because of this.</p>
<p><img src="/wp-content/uploads/2013/04/pusher-delete-1024x638.png" alt="pusher-delete" width="1024" height="638" class="aligncenter size-large wp-image-23767" /></p>
<p>You only get the <code>id</code> of the item that was deleted in the <code>DELETE</code> do you need to create an object with an <code>id</code> property e.g. <code>{ id: 'some_id'}</code></p>
<h3>Are the events being triggered</h3>
<p>You can check to see if events are being triggered by using the existing application, which doe cause the scripts to be executed, and then view the <a href="http://pusher.com/docs/debugging#pusher_debug_console">Pusher Debug Console</a></p>
<p><img src="/wp-content/uploads/2013/04/pusher-debug-console.png" alt="pusher-debug-console" width="811" height="474" class="aligncenter size-full wp-image-23776" /></p>
<h3>Making the front-end realtime</h3>
<p><code>app.js</code> relied quite heavily on a function called <a href="https://github.com/leggetter/pusher-azure-todo/blob/bf07e3c0ec944f5ed74096cc1d748f5e26cd5cda/app.js#L7-L26"><code>refreshTodoItems</code></a>. <strong>Yuck!</strong> every time something happens in the application this function would query the Windows Azure Mobile data service to get all the new data. Why do this when you can just instantly push the changes to the client as they happen?!</p>
<p>If you'd prefer to read the code to see the changes you can do that via the <a href="https://github.com/leggetter/pusher-azure-todo/commit/4b4d6157c965c80de71a5798daaba68c4c03ee6d">"goodbye refresh, hello Pusher"</a> commit which shows all the changes I made.</p>
<p>But, here are a few details.</p>
<h3>The pusher-js script tag</h3>
<p>A simple include:</p>
<p><a href="https://github.com/leggetter/pusher-azure-todo/commit/4b4d6157c965c80de71a5798daaba68c4c03ee6d#L1R34"><img src="/wp-content/uploads/2013/04/pusher-js.png" alt="pusher-js" width="930" height="150" class="aligncenter size-full wp-image-23768" /></a></p>
<h3>Create a Pusher instance, subscribe and bind</h3>
<p>You create a new <code>Pusher</code> instance and pass in your <code>app_key</code>. Doing this connects your app to Pusher.</p>
<p>You also identify that we're interested in changes to the <code>todo</code> list - you'll have seen that we were triggering on the <code>todo</code> channel in the mobile data services script.</p>
<p>For each type of event (<code>insert</code>, <code>update</code> and <code>delete</code>) that we expect on the channel and have a different function handle each of these.</p>
<p><a href="https://github.com/leggetter/pusher-azure-todo/commit/4b4d6157c965c80de71a5798daaba68c4c03ee6d#L0R14"><img src="/wp-content/uploads/2013/04/pusher-instance-channels.png" alt="pusher-instance-channels" width="926" height="137" class="aligncenter size-full wp-image-23770" /></a></p>
<h3>Handle create events</h3>
<p>When a new item is created we need to insert it into the existing list:</p>
<p><a href="https://github.com/leggetter/pusher-azure-todo/commit/4b4d6157c965c80de71a5798daaba68c4c03ee6d#L0R41"><img src="/wp-content/uploads/2013/04/create-insert.png" alt="create-insert" width="928" height="351" class="aligncenter size-full wp-image-23772" /></a></p>
<p>The <code>createItem</code> function actually create a <code>&lt;li&gt;</code> and the <code>insertItem</code> function actually appends it to the view. We also reuse <code>createItem</code> function in the function that we renamed <code>refreshTodoItems</code> (<strong>Yuck!</strong>) to - <a href="https://github.com/leggetter/pusher-azure-todo/commit/4b4d6157c965c80de71a5798daaba68c4c03ee6d#L0R21"><code>initTodoItems</code></a>. This means we only query the mobile service endpoint once when the app initial loads - <strong>Win!</strong>. Notice how many times I got to delete <code>refreshTodoItems</code> in <a href="https://github.com/leggetter/pusher-azure-todo/commit/4b4d6157c965c80de71a5798daaba68c4c03ee6d#L0L47">the commit</a>.</p>
<h3>Handle update events</h3>
<p>Because only the updated data is sent to the <code>update</code> handler this function is a bit bigger than I would have liked. We simply check to see what data is present in the update and then change the list as required:</p>
<p><a href="https://github.com/leggetter/pusher-azure-todo/commit/4b4d6157c965c80de71a5798daaba68c4c03ee6d#L0R61"><img src="/wp-content/uploads/2013/04/update-item.png" alt="update-item" width="930" height="275" class="aligncenter size-full wp-image-23773" /></a></p>
<h3>Handle delete events</h3>
<p>The delete event handler is passed an <code>item</code> with an <code>id</code> property. We simply find the <code>&lt;li&gt;</code> in the view with this <code>id</code>, slide it out of view and then remove it from the DOM.</p>
<p><a href="https://github.com/leggetter/pusher-azure-todo/commit/4b4d6157c965c80de71a5798daaba68c4c03ee6d#L0R77"><img src="/wp-content/uploads/2013/04/delete-item.png" alt="delete-item" width="928" height="131" class="aligncenter size-full wp-image-23775" /></a></p>
<h3>It's now realtime</h3>
<p>If you now use the app, any time somebody else makes a change it'll instantly be broadcast to anybody else viewing the application.</p>
<p>Next, to deploy it to Windows Azure Web Sites</p>
<h3>Windows Azure Web Sites</h3>
<p>Creating a Windows Azure Web Site is a piece of cake!</p>
<p><img src="/wp-content/uploads/2013/04/create-website.png" alt="create-website" width="1163" height="252" class="aligncenter size-full wp-image-23778" /></p>
<p>In the following dialog make sure you check the "Publish from source control" checkbox. You can then choose to either sync with an existing github repo (very cool) or use a git repo and push to it. A nice simple tutorial on this can be found in the <a href="http://www.windowsazure.com/en-us/develop/net/common-tasks/publishing-with-git/">Publishing from Source Control to Windows Azure Web Sites guide</a>.</p>
<p><img src="/wp-content/uploads/2013/04/create-publish-source.png" alt="create-publish-source" width="713" height="480" class="aligncenter size-full wp-image-23777" /></p>
<p>Add the remote repo locally using <code>git remote add azure &lt;repo_url&gt;</code>, then you can push to use using <code>git push azure master</code>. The Windows Azure portal actually updates straight away to show that the app has been deployed:</p>
<p><img src="/wp-content/uploads/2013/04/push-to-azure.png" alt="push-to-azure" width="1076" height="327" class="aligncenter size-full wp-image-23780" /></p>
<p>The app is now live - <strong>or is it?</strong> It's <strong>GOTCHA</strong> time.</p>
<h3>Gotchas</h3>
<h4>.js in root directory = node.js env detection</h4>
<p>The first gotcha I came across was that it seem like the environment detection assumes your app is a Node.js app if you have a <code>js</code> file in the root directory. To get around this I had to <a href="https://github.com/leggetter/pusher-azure-todo/commit/020527f2282455ac7fd064dd2a7e5c4ae1e5a3ef">move <code>app.js</code> to <code>js/app.js</code></a>.</p>
<h4>Cross scheme and Origin (CORS) communication</h4>
<p>Browsers implement rules that mean you can't communicate cross scheme: http <-> https. So, make sure that the app/web page and the assets (JavaScript) are all <a href="https://github.com/leggetter/pusher-azure-todo/commit/30323655fc31c9c9cb6fed0c6b2e930c855a21de">served from the same scheme</a>.</p>
<p>One final thing you need to do is allow access from a given domain via the configuration for your mobile services. I came across this right at the end and nearly cried when I didn't think it was going to happen. But, unsurprisingly **the Gu* <a href="http://weblogs.asp.net/scottgu/archive/2013/03/18/windows-azure-new-hadoop-service-html5-js-cors-phonegap-mercurial-and-dropbox-support.aspx">came to the rescue</a>.</p>
<p><img src="/wp-content/uploads/2013/04/cors-config.png" alt="cors-config" width="925" height="334" class="aligncenter size-full wp-image-23781" /></p>
<p><strong>Update</strong></p>
<p>It would appear that CORS settings can get out of sync:</p>
<blockquote class="twitter-tweet"><p>Just noticed the the CORS settings for an <a href="https://twitter.com/search/%23Azure">#Azure</a> <a href="https://twitter.com/search/%23MobileServices">#MobileServices</a> app got out of sync. CORS wasn't working so I had to edit &amp; save to re-sync</p>
<p>&mdash; Phil Leggetter (@leggetter) <a href="https://twitter.com/leggetter/status/323483739122434048">April 14, 2013</a></p></blockquote>
<p><script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script></p>
<h3>Tada - I mean TODO!</h3>
<p>We no have a To Do list that multiple users can collaborate on and instantly see the changes as they happen. The back-end is powered by <a href="http://www.windowsazure.com/en-us/develop/mobile/">Windows Azure Mobile Services</a>, the realtime communication is achieved using <a href="http://pusher.com">Pusher</a> and the app/site is hosted on a <a href="http://www.windowsazure.com/en-us/home/scenarios/web-sites/">Windows Azure Web Site</a>.</p>
<p>Not bad for a few hours work whilst at Stacked13! What are you waiting for? Start playing with the <span style="text-decoration: line-through">realtime collaborative Windows Azure Mobile Service To Do app</span>.</p>

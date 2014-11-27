---
layout: post
status: publish
published: true
title: Notes on Falsy Values
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 16125
wordpress_url: "http://www.leggetter.co.uk/?p=16125"
date: "2011-05-24 22:32:59 +0100"
date_gmt: "2011-05-24 21:32:59 +0100"
categories:
  - Technology
tags:
  - JavaScript
  - pusher
  - Falsy Values
  - Events
permalink: /2011/05/24/notes-on-falsy-values.html
---

<p>I spent the majority of last week in Warsaw at <a href="http://falsyvalues.com">Falsy Values</a> where I attended a Games Workshop and a conference day. It was also my first week working as a Developer Evangelist working for <a href="http://pusher.com">Pusher</a>. A big and exciting week all round.</p>
<h3>HTML5 Games Workshop</h3>
<p>The HTML5 games workshop was ran by <a href="http://twitter.com/kuvos">@kuvos</a> and <a href="http://twitter.com/pornelski">@pornelski</a> and we went through building a game of Tetris and then <a href="http://qfox.nl/weblog/232">Mario</a>. I was very impressed to see what can be achieved with Canvas and the workshop provided a lot of food for thought about the sorts of things that would be really useful to HTML5 games developers. Watch this space, and the <a href="http://blog.pusherapp.com/2011/5/22/pusher-at-falsy-values">Pusher blog</a>.</p>
<h3>The Keynote</h3>
<p>[caption id="attachment_16127" align="aligncenter" width="225" caption="Douglas Crockford at Falsy Values - and a Pusher banner!"]<a href="/wp-content/uploads/2011/05/pusher_crockford.jpg"><img class="size-medium wp-image-16127" title="Douglas Crockford at Falsy Values - and a Pusher banner!" src="/wp-content/uploads/2011/05/pusher_crockford-225x300.jpg" alt="Douglas Crockford at Falsy Values - and a Pusher banner!" width="225" height="300" /></a>[/caption]</p>
<p>The morning of the conference day saw a few fuzzy heads from the Pusher party the night before, but they soon cleared as <a href="http://www.crockford.com/">Douglas Crockford</a> delivered the keynote. He covered the good and bad parts of JavaScript and how, as developers, we need to us a combination of head and gut (instinct) when writing code. <a href="http://www.jslint.com/">JSLint</a> got a number of mentions and Douglas stressed the importance of following coding practices. He explained that just because JavaScript lets us do something, it doesn’t mean we should necessarily do it.  Here are a couple of examples:</p>
<h4>Always use treble equals for comparisons</h4>
<p>[code lang="js"]<br />
if(myVar === 0) {<br />
}<br />
[/code]</p>
<p>Many of us already know that double equals can lead to problems. 0 compared with an empty string will evaluate to try, undefined compared with null will evaluate to true and a number of no so obvious examples:</p>
<p>[code lang="js"]<br />
&quot;0&quot; == 0 // true<br />
&quot;00&quot; == false // true<br />
true == 1 // true<br />
undefined == null // true<br />
[/code]</p>
<p>Therefore Douglas believes it’s best practice to always use treble equals so that the code intent is absolutely clear.</p>
<h4>Put curly brackets after parenthesis</h4>
<p>[code lang="js"]<br />
function myFunc() {<br />
}<br />
[/code]</p>
<p>This was a hard one to swallow as I like to put my parenthesis on the left - on the next line. However, Douglas provided an example which made me realise that it could be a bad thing.</p>
<p>[code lang="js"]<br />
function buildObjectLiteral()<br />
{<br />
   return // this returns!<br />
   {<br />
      &quot;someProperty&quot;: &quot;hello&quot;<br />
   };<br />
}<br />
[/code]</p>
<p>The interesting thing here is that undefined will be returned because a line break is also ends a statement in JavaScript. I don’t think I would actually ever do this. I would probably assign the object literal to a variable first and then return it. However, if I didn’t follow this rule I might make the above mistake. If it can happen then the easiest way to avoid it is just don’t do it. So, curly brackets now go on the same line – on the right.</p>
<h3>Do the right thing</h3>
<p>Douglas explained that he has made some changes to his coding practices recently. A developer had contacted him asking if JSLint should report a problem if it found a switch statement that allowed any code to fall through between cases. Although he had a gut feeling that it was probably not a good thing to do he believed that it would “hardly ever” cause a problem. Some time later the developer got back to Douglas saying he’d found a bug in JSLint. The bug was causes by a switch statement which allowed code to fall through cases. Doug has now formed the opinion that if something can cause a problem, even if it’s unlikely, that the best practice is don’t do it.</p>
<p>[code lang="js"]<br />
switch(test)  {<br />
   case 0:<br />
      // don’t do it!<br />
   case 1:<br />
      break;<br />
   case 2:<br />
      break;<br />
}<br />
[/code]</p>
<h3>When will ECMAScript 6 reach the web browser?</h3>
<p><a href="http://twitter.com/#%21/dmitrysoshnikov">Dmitry Soshnikov</a> gave a talk on <a href="http://wiki.ecmascript.org/doku.php">ECMAScript 6</a>, codename Harmony. Whilst there seem like some good ideas going to to ES6 the question remains when will anybody actually be able to use it in a web browser? It will probably a be available in <a href="http://nodejs.org/">node.js</a> before it's most browser runtimes. It also sounded like a lot of syntactical things were being drawn from Erlang - not sure about this.</p>
<p>Slides: <a href="http://www.slideshare.net/dmitrysoshnikov/falsyvalues-dmitry-soshnikov-ecmascript-6">http://www.slideshare.net/dmitrysoshnikov/falsyvalues-dmitry-soshnikov-ecmascript-6</a></p>
<h3>Fabric.js - the new defacto JS Library for Canvas?</h3>
<p>I didn't sit through this talk as I had to pop out and get some work done and thought my tapping on a keyboard would annoy those around me. However, whilst in the games workshop it was very clear that it's unlikely that people would be accessing the Canvas API directly and that, in the same way that very few people use document.getElementById, very few people will directly call canvas.getContext("2d") - they use a library that offers richer functionality to the developer. <a href="http://kangax.github.com/fabric.js/test/demo/">Fabric.js</a> provides exactly that.</p>
<p>The talk was given by <a href="twitter.com/kangax">Juriy "kangax" Zaytsev</a> on Fabric.js and you can check out the demos from here:<br />
<a href="http://kangax.github.com/fabric.js/test/demo/">http://kangax.github.com/fabric.js/test/demo/</a></p>
<h3>JavaScript JIT</h3>
<p><a href="http://twitter.com/#%21/zbraniecki">Zbigniew Braniecki</a> of Mozilla gave a really interesting talk about JavaScript engine Just-in-time compilation methods. There are two types of compilation, method and tracing. Here's how I understand they work. Method counts the number of times a method is called and if it reaches a certain number of calls then the method is compiled (no longer interpreted). Tracing analysis code paths and compiles code paths that are commonly executed. Apparently there is very little documentation on this and Zbigniew had to do a lot of work to find out which methods each browser uses and to come up with the slides.</p>
<p>The point of his talk was that we can actually help compilers make our apps faster by writing code with the compilers in mind. In most cases this won't be necessary but if you are trying to squeeze that extra bit of performance out of your app it's something you might consider.</p>
<p>Slides: <a href="http://www.slideshare.net/zbraniecki/js-compilation-falsy-values-slides">http://www.slideshare.net/zbraniecki/js-compilation-falsy-values-slides</a></p>
<h3>PhoneGap</h3>
<p>Unfortunately I missed this one but it was delivered by <a href="http://twitter.com/#%21/BrianLeRoux">Brian LeRoux</a> and he demonstrated how to build an app in PhoneGap. Go check out <a href="http://www.phonegap.com/">PhoneGap</a>, it sounds super useful.</p>
<h3>Has JavaScript won?</h3>
<p>There were two other presentations, first <a href="http://twitter.com/#%21/sh1mmer">Tom Hughes-Croucher</a> on <a href="http://nodejs.org/">node.js</a>, who also ran the node.js workshop on the first two days, and finally <a href="http://twitter.com/#%21/t">Tantek Çelik</a> talking about his new project <a href="http://tantek.pbworks.com/w/page/19402872/CassisProject">CASSIS</a> which defines a sub-set of JavaScript which can run both in JavaScript and PHP. As I mention in my post about Falsy Values on the Pusher blog, right now is a great time to be a JavaScript developer. You can now developer server applications, in the browser, for mobile devices and also for the desktop.</p>
<p>It's really strange to think that in 2004 I left a job because I was doing purely JavaScript and I wasn't sure the language was going anywhere. How wrong was I? :)</p>
<p>Finally, a big thanks to <a href="http://twitter.com/#%21/czerskip">Pawe? Czerski</a> and <a href="http://twitter.com/#%21/varjs">Damian Wielgosik</a> who organised Falsy Values. Well done guys!</p>

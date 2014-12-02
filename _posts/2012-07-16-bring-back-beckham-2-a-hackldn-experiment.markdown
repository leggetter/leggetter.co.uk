---
layout: post
status: publish
published: true
title: "Bring Back Beckham 2 - A #HackLDN experiment"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 23402
wordpress_url: "http://www.leggetter.co.uk/?p=23402"
date: "2012-07-16 14:42:49 +0100"
date_gmt: "2012-07-16 13:42:49 +0100"
categories:
  - Technology
tags:
  - PHP
  - bring back beckham
  - hackLDN
  - startups
  - hackathon
  - beckham
permalink: /2012/07/16/bring-back-beckham-2-a-hackldn-experiment.html
excerpt: "A couple of weeks ago I attended HackLDN for the 2nd time. The focus of the event is very much to create something with real business potential. I completely understand the reasoning behind that and back the idea. But, if everybody had an idea and everybody wanted to work on their own project, to create a company, then there would be a lot of one-man/woman teams. We need people to go along to have fun and experiment with technologies. These types of people are as important as the 'entrepreneurs'. I decided to pitch Bring Back Beckham (redux) as a fun experiment - not a startup idea. And low and behold I ended up with a team."
---

<p><img src="http://f.cl.ly/items/120q37130m2k382p3b2G/bbb-redux.png" width="200" align="right" style="margin: 20px;" alt="Bring Back Beckham banner" /></p>
<p>A couple of weeks ago I attended <a href="http://hackathonlondon.com/">HackLDN</a> for the 2nd time. The focus of the event is very much to create something with real business potential. I completely understand the reasoning behind that and back the idea. But, if everybody had an idea and everybody wanted to work on their own project, to create a company, then there would be a lot of one-man/woman teams. We need people to go along to have fun and experiment with technologies. These types of people are as important as the 'entrepreneurs'. I decided to <a href="/2012/06/29/hackldn-idea-bring-back-beckham.html">pitch Bring Back Beckham (redux)</a> as a fun experiment - not a startup idea. And low and behold I ended up with a team.</p>
<p>You can read and watch <a href="/2012/06/29/hackldn-idea-bring-back-beckham.html">the pitch</a> if you want to find out some more about the idea. This post is more to thank the guys I worked with and provide a bit of information about what we came up with.</p>
<h2>The Team</h2>
<p><img src="/wp-content/uploads/2012/07/553838_10151068133476154_921499766_n.jpeg" alt="Bring Back Beckham team" /></p>
<p>The Bring Back Beckham team consisted of a bunch of guys who would class themselves as being more ideas people than programmers - and me (not sure what I class myself as ;)). But, unlike a lot of entrepreneurs these guys <strong>want</strong> to write code - they want to be able to prototype an idea. For me, that's really important and great to see.</p>
<h3>Bobby CE Ong</h3>
<p><a href="https://twitter.com/bobbyong">@bobbyong</a></p>
<blockquote>
<p>After a couple of frustrating attempts in trying to prototype web development ideas by first finding a CTO, I reached the conclusion that the best way forward is by learning coding. Having taught myself programming for the past 6 months, I came to #HackLDN to improve my web development skills. I can safely conclude that #BringBackBeckham had been an awesome project to work on and definitely made me a much better developer.</p>
</blockquote>
<h3>John King</h3>
<p><a href="https://twitter.com/john_king">@john_king</a></p>
<blockquote>
<p>Having recently graduated from University I've a number of business projects I'd like to set in motion. A relative novice at web design and programming I came to the Hack London event in order to meet other like minded individuals and to improve my programming skills. I got all this and more; including free Dominos, KFC, copious red bull, unabashed Pusher plugs by the hour and deeper understanding of the hacker communities sleeping habits</p>
</blockquote>
<h3>Rich Allen</h3>
<p><a href="https://twitter.com/Magic_Rich">@Magic_Rich</a></p>
<blockquote>
<p>When I'm not supporting Beckham to be in the Olympics as he deserves, I also run a UK ticket comparison site <a href="http://www.theatrebillboard.com">http://www.theatrebillboard.com</a> and a Facebook application <a href="http://apps.facebook.com/ticket_hunter">http://apps.facebook.com/ticket_hunter</a>. I have enjoyed making this site at the Hack London event and furthered my skills.</p>
</blockquote>
<h2>The App</h2>
<p>The purpose of Bring Back Beckham 2 (redux - whatever!) was to try and create an instant impact, high traction application - and potentially a framework. Something that would be a central location on the Internet for all things related to Beckham's exclusion from Team GB.</p>
<h3>Features</h3>
<p>Our features list included:</p>
<ul>
<li>Simple Yes/No vote about whether Beckham should be included and if Pearce had made the correct decision.</li>
<li>The ability to provide a comment along with the vote.</li>
<li>Instantly display other votes and comments using Pusher to keep users on the site.</li>
<li>Turn the comments into a conversation using replies.</li>
<li>Vote up/down comments</li>
<li>Include news from other sources - to ensure the site was the central focused destination for all things Beckham and Team GB related.</li>
</ul>
<h3>Tech</h3>
<p>We decided to write the new Bring Back Beckham in <strong>PHP</strong> (WAMP/MAMP/LAMP) - not because anybody actually had PHP skills - more because it's probably one of the easiest languages to get started with<sup>†</sup> and there wasn't another language that the team were all familiar with.</p>
<p><small><sup>†</sup><em>Would anybody argue differently?</em></small></p>
<p>Of course we'd use <a href="http://pusher.com">Pusher</a> for the realtime voting and interactive parts of the application; vote up/down, replies, comments, vote % updates.</p>
<p>So, after a bit of work setting up runtime environments we all got to coding. PHP/MySQL with <a href="http://mamp.info/en/index.html">MAMP</a> and <a href="http://www.apachefriends.org/en/xampp.html">xampp</a> does make it really easy to get started no matter your development machine. Can the same be said for Ruby on Rails or node.js? I'll need to dig into this.</p>
<p>Use source control from the off - no matter the level of experience in your team. We initially tried to use Dropbox to share our code. We soon found that this wasn't a good idea. I'd been a bit worried about using source control as thought it would mean spending lots of time dealing with that rather than coding. I was completely wrong. We used <a href="http://github.com">github</a> and even though there were moments that slowed us down, e.g. the first time somebody came across a merge conflict, it really sped up the development process. Checkout <a href="http://try.github.com">try.github.com</a>.</p>
<p>Another decision I made, again because I assumed it would make things harder for the team, was not to use an application framework. I now can't help but wonder if we should have tried to use something <a href="http://fuelphp.com/">FuelPHP</a> from the off.</p>
<h2>What we achieved and learned</h2>
<p>The site is live at <a href="http://www.bringbackbeckham.com">http://www.bringbackbeckham.com</a>. We have a voting system along with comments. We also have realtime updates when new comments come in.</p>
<p><a href="http://www.bringbackbeckham.com"><img src="http://f.cl.ly/items/120q37130m2k382p3b2G/bbb-redux.png" width="500" /></a></p>
<h3>We could have achieved more</h3>
<p>I feel responsible for us not delivering more. I under-estimated the ability for the team to pick up best practices. The things we did do like project management using a Kanban-like process and source control using github were real successes.</p>
<h3>Gaining traction takes time</h3>
<p>On the Sunday morning we launched and did start to get a bit of traction through Facebook and Twitter along. But, to really obtain traction you need to put in a lot of effort, look for posts to comment on, engage in conversations on Twitter, be willing and able to argue the point - all of this takes time. We ran out of it.</p>
<h3>Understand your cause</h3>
<p>People will quickly see if you know the subject or are just doing something for commercial or spammy reasons. So, it's essential that the people manning your social media channels are knowledgable and passionate about the subject.</p>
<h3>Emails go stale :)</h3>
<p>We did have 6,000 emails from the last Bring Back Beckham campaign. But we soon learned that emails go stale and Mailchimp quickly suspended our account due to a high bounce-rate. They've since enabled it again.</p>
<h3>Marketing is as important as the tech</h3>
<p>It's no doubt the same with other technologies and ideas; you can have the best product in the world but it's useless if nobody knows about it.</p>
<h3>Fun achieved</h3>
<p>I also felt we had real moments of excitement during the project. This brought back some of the excitement I had from the original project which was one of the main reasons I wanted to try this project again.</p>
<h3>Framework</h3>
<p>We do actually have a partial framework in place. If you look at the site you can see that it would be very easily to change the site to focus on a different campaign. What it is missing is anything that make the site a go-to source; it needs news curated from external sources. We also didn't add vote up/down and 'reply to comment' features which would have made the site much more interactive. But, I'm hopeful that we'll work on this in the background and eventually have a framework which we can use again should the opportunity arise.</p>
<h2>Thanks to the team</h2>
<p>Finally, a big thanks to Bobby, John and Rich. It was really great to work with you all and I look forward to diving in and out of the project over the coming months to continue the learning experience - and you never know, there might be another opportunity to use what we've built in the future!</p>

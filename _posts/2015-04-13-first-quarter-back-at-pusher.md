---
layout: post
title: "2015 Q1 Personal Review"
excerpt: ""

---

I like retrospective-style posts. When writing them I get to look back at the things I've done and am often surprised, pleased and encouraged to improve. I also enjoy reading retrospective posts of others, particularly from those who are doing similar things or those that I look up to and learn from.

Hopefully the majority will forgive the indulgence of a personal retrospective and a few - like me - will find it interesting and useful. If you're considering a developer evangelist role this may provide you with some insight. If you're already working in a similar role then it might be a useful comparison. I'll also do a [summary retrospective](#retro) including a few stats, and cover what some my [plans are for 2015 Q2](#q2-plans).

So, what have I done in the first quarter of 2015 since [rejoining Pusher](http://www.leggetter.co.uk/2013/07/04/leaving-pusher-what-next.html)?

* 6 Talks
  * [Large Scale JS @ FED London in January](#fed-london)
  * [A 10 Minute Guide to Choosing A Realtime Framework @ ForwardJS, San Francisco in February](realtime-guide)
  * [You Have Real-Time Data. You Just Don't Know It. @ Developer Week, San Francisco in February](#realtime-data-sf)
  * [You Have Real-Time Data. You Just Don't Know It. @ CloudConf, Turin, Italy in March](#realtime-data-turin)
  * [Large Scale JS @ DevWeek, London in March](#brjs-ldn)
  * [Why You Should be Using Web Components Now. And How. @ DevWeek, London in March](#web-components)
* Attended 3 Events
  * [PHP UK](#php-uk)
  * [jQuery UK](#jq-uk)
  * [LondonAPI](#london-api)
* [Contributed to 4 Pusher Libraries](#pusher-libs)
* [Created the Pusher API Pitch](#api-pitch)
* [3 Blog Posts + Post Reviews](#blogs)

Full details below.

## 6 Talks

When you have an evangelist-style role you tend to commit quite far ahead to involvement in events. So, when you change jobs you can end up with commitments that don't fully align with the new role. The fortunate side of this is that if you're lucky you only commit to things you're genuinely interested in. That was the case with me this quarter as I had a couple of talks related to [BladeRunnerJS](http://bladerunnerjs.org).

### <a name="fed-london">Large Scale JS @ FED London in January</a>

<a href="https://www.youtube.com/watch?v=7e9zHre5oBI"><img src="/images/2015-q1-retro/leggetter-fed-london.png" alt="Phil Leggetter speaking at FED London" style="width: 300px; float: right; margin: 20px;"/></a>

I was invited to talk at [FED London in January](http://www.eventbrite.co.uk/e/fed-london-sponsored-by-yahoo-registration-14767545125) to talk about building large scale JavaScript apps. It was at the Yahoo! offices in London at talks were also given on Atomic CSS, JavaScript transpilers and TypeScript.

It was a really well attended event and it was very interesting to speak to the Yahoo! engineers afterwards that were coming across the same [Selenium](http://www.seleniumhq.org/)-based UI testing problems that I covered in part of my talk and that I [spoke about last year](https://vimeo.com/96430139) at [ScotlandJS](http://scotlandjs.com/).

You can watch the talk [Large Scale JS App talk](https://www.youtube.com/watch?v=7e9zHre5oBI) I gave at FED London.

### <a name="realtime-guide">A 10 Minute Guide to Choosing A Realtime Framework @ ForwardJS, San Francisco in February</a>

<a href="https://leggetter.github.io/realtime-tech-stack/fwd2-2015/"><img src="https://leggetter.github.io/realtime-tech-stack/fwd2-2015/img/realtime-web-solutions-updated.png" alt="10 Minute Guide to Choosing Your Real-time Framework Slides" style="width: 300px; float: right; margin: 20px;"/></a>

Back in 2013 I spoke at FOWA about [How to Choose Your Real-Time Web App Tech Stack](http://www.leggetter.co.uk/2014/01/19/video-choosing-realtime-web-app-tech-stack.html). It's a talk that I've only given once and for those that give talks relatively frequently you'll know it's great to be able to reuse talks. Not just because so much time an effort goes into creating talks, but also because you get to incrementally improve the talk the more you give it.

So, I took the talk at [ForwardJS 2](http://forwardjs.com/forward2) in San Franciso as an opportunity to look back at the 2013 talk, revise and condense the information into a [10 minute guide on choosing a real-time framework](https://leggetter.github.io/realtime-tech-stack/fwd2-2015/).

### <a name="realtime-data-sf">You Have Real-Time Data. You Just Don't Know It. @ Developer Week, San Francisco in February</a>

<a href="https://www.youtube.com/watch?v=P31lGHG_lL4"><img src="/images/2015-q1-retro/you-have-realtime-goffice-record.png" alt="Phil Leggetter You Have Realtime Data - Recording from Office" style="width: 300px; float: right; margin: 20px;"/></a>

Since I started evangelism in 2010 I've always tried to be open in my evangelism of Real-Time technologies. The "choosing your real-time framework" talk demonstrates this. I'm continuing my personal crusade is to try and make as many people as possible realise that they do have use for real-time technologies within the applications they are building.

Right now, I'm specifically trying to emphasise that **everybody has real-time data within their applications**, how to identify that data and how it can be used.

[Developer Week](http://developerweek.com/) in San Francisco represented the first opportunity I had to talk about this topic. Since the talk wasn't recorded I put together a [video of the talk to send to attendees](https://www.youtube.com/watch?v=P31lGHG_lL4) afterwards.

### <a name="realtime-data-turin">You Have Real-Time Data. You Just Don't Know It. @ CloudConf, Turin, Italy in March</a>

Pusher were invited to send somebody along to [CloudConf](http://2015.cloudconf.it/). It's great for us to be considered along with representatives from Google, Amazon, MongoDB, Red Hat, Digital Ocean, Twilio and many more.

I took the opportunity to continue my *You Have Real-Time Data Crusade* and you can see the slides from the event [here](http://leggetter.github.io/you-have-realtime/cloudconf2015/).

<blockquote class="twitter-tweet" lang="en" align="center"><p>You have <a href="https://twitter.com/hashtag/realtimeData?src=hash">#realtimeData</a>. You just don&#39;t know it! - <a href="https://twitter.com/leggetter">@leggetter</a> <a href="https://twitter.com/_CloudConf_">@_CloudConf_</a> <a href="https://twitter.com/hashtag/cloudConf2015?src=hash">#cloudConf2015</a> <a href="http://t.co/ceyO2VbDZH">pic.twitter.com/ceyO2VbDZH</a></p>&mdash; Diego Guarrella (@Fomalhaut_01) <a href="https://twitter.com/Fomalhaut_01/status/578555804711813120">March 19, 2015</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>


It was also a great social and networking experience.

<blockquote class="twitter-tweet" lang="en" align="center"><p>Conferences are for sharing &amp; they&#39;re awesome! <a href="https://twitter.com/nleite">@nleite</a> <a href="https://twitter.com/philnash">@philnash</a> <a href="https://twitter.com/leggetter">@leggetter</a> <a href="https://twitter.com/old_sound">@old_sound</a> <a href="https://twitter.com/auroradoc">@auroradoc</a> Thx <a href="https://twitter.com/hashtag/cloudconf2015?src=hash">#cloudconf2015</a> <a href="http://t.co/drLgeX0ir4">pic.twitter.com/drLgeX0ir4</a></p>&mdash; Felipe Hoffa (@felipehoffa) <a href="https://twitter.com/felipehoffa/status/578888221565804544">March 20, 2015</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

### <a name="brjs-ldn">Large Scale JS @ DevWeek, London in March</a>

For probably the last time, I spoke about building Large-Scale JS apps. Since this was at DevWeek I went with the title [Patterns and practices for building enterprise-scale HTML5 apps](http://www.slideshare.net/leggetter/patterns-and-practices-for-building-enterprisescale-html5-apps).

### <a name="web-components">Why You Should be Using Web Components Now. And How. @ DevWeek, London in March</a>

<a href="https://leggetter.github.io/web-components-now/devweek-2015/"><img src="/images/2015-q1-retro/using-web-components.png" alt="Phil Leggetter - Using Web Components Now Slides" style="width: 300px; float: right; margin: 20px;"/></a>

Having spent over a year evangelising building componentised web apps I'm naturally excited to see where Web Components are taking us. I started looking into Web Components in more detail when I wrote up [The State of the Componentised Web](http://www.leggetter.co.uk/2014/08/06/state-componentised-web.html) in August 2014. I'm particularly interested in the software engineering benefits of building JavaScript applications out of components. How they naturally encourage encapsulation, re-use, functional cohesion and functional separation of concerns within apps.

<blockquote class="twitter-tweet" lang="en" align="center"><p>Watching <a href="https://twitter.com/leggetter">@leggetter</a> talking Web Components at <a href="https://twitter.com/hashtag/DevWeek2015?src=hash">#DevWeek2015</a> <a href="http://t.co/DPrlcXV429">pic.twitter.com/DPrlcXV429</a></p>&mdash; Mike Elsmore (@ukmadlz) <a href="https://twitter.com/ukmadlz/status/580665346895532032">March 25, 2015</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

This talk was recorded so I'll post it as soon as I can. For now, here are [the slides](https://leggetter.github.io/web-components-now/devweek-2015/).

## Event Attendance

I'm pretty terrible at going to events purely to attend. I feel particularly bad about this when amazing meetups like [TechMeetup](http://techmeetup.co.uk/) Edinburgh and Glasgow and JS events like [EdinburghJS](https://twitter.com/edinburghjs) and [GlasgowJS](https://twitter.com/glwjs) are only an hour's drive away from where I live.

So far this year things haven't really changed. But I did manage to make my way to a few events.

### <a name="php-uk">PHP UK, London in February</a>

Everybody knows PHP has an interesting reputation - including everybody who uses PHP. I know Pusher is really valuable hosted service for those that are using PHP because it's difficult to add real-time functionality to a PHP app sticking purely to using PHP. Pusher makes it easy to stick with PHP and still add real-time functionality to PHP apps. So, I wanted to know what was going on in the PHP community.

<blockquote class="twitter-tweet" lang="en" align="center"><p>I wrote up some thoughts on <a href="https://twitter.com/hashtag/phpuk15?src=hash">#phpuk15</a>. Pragmatic, Progressive and Open <a href="http://t.co/iqCeBl1tqH">http://t.co/iqCeBl1tqH</a> HT to <a href="https://twitter.com/lornajane">@lornajane</a> <a href="https://twitter.com/ricardclau">@ricardclau</a> &amp; <a href="https://twitter.com/choult">@choult</a></p>&mdash; Phil Leggetter (@leggetter) <a href="https://twitter.com/leggetter/status/569784417968918528">February 23, 2015</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

I really enjoyed the event and wrote up a post about how I found [PHP 2015 Progressive Hosted and Pragmatic](https://blog.pusher.com/php-2015-pragmatic-progressive-open/) (see what I did there!).

### <a name="jq-uk">jQuery UK, Oxford in March</a>

<a href="http://jqueryuk.com/2015/videos.php?s=real-world-jquery"><img src="/images/2015-q1-retro/ben-foxall-jquery-uk.png" alt="Ben Foxall at jQuery UK" style="width: 300px; float: right; margin: 20px;"/></a>

jQuery is another framework that has an interesting reputation! But it's used by so many of us that it's not going away any time soon... it also fulfills lots of ongoing requirements when building web apps.

Interestingly enough there was very little talk of jQuery at the jQuery event. It was much more JavaScript and web development focused. Topics covered included tips on CSS from GitHub of [Mark Otto](https://twitter.com/mdo), Web Components by [Soledad Penadés](https://twitter.com/supersole) of Mozilla, What is the JS Event Loop by [Philip Roberts](https://twitter.com/philip_roberts), Security First by [Alex Sexton](https://twitter.com/slexaxton) of Stripe, building resilient front-ends by [Andy Hume](https://twitter.com/andyhume) from Twitter, Chrome Dev Tools updates by [Addy Osmani](https://twitter.com/addyosmani), [Natasha Rooney](https://twitter.com/thisnatasha) on ServiceWorker and an amazing [realtime (Pusher-assisted) multi-device demonstration by Ben Foxall](http://jqueryuk.com/2015/videos.php?s=real-world-jquery).

### <a name="london-api">LondonAPI, London in March</a>

<img src="/images/2015-q1-retro/phil-nash-stevie-g.jpg" style="height: 220px; float: right; margin: 20px;"/>

I was in London for my two talks at DevWeek so I took the opportunity to take in a [LondonAPI](http://www.meetup.com/London-API-Group/) event.

I saw talk from [Phil Nash](https://twitter.com/philnash) of Twilio on WebHooks, [Simon Wood](https://twitter.com/hpoom) of Holiday Extras on HTTP/REST developer tools and my old mate [Stevie Graham](https://twitter.com/stevegraham) on the really interesting tech/hacking behind [Teller API](https://twitter.com/tellerapi).

## <a name="pusher-libs">Pusher Library Contribution</a>

I've missed the opportunity to work on SDKs. The Pusher Libraries are core to the developer experience at Pusher - it's how developers interact with the service - so it's great to be able to make changes, improve things and have those changes and improvements used by thousands of developers.

I've pushed new versions of the [Pusher .NET HTTP library](https://github.com/pusher/pusher-http-dotnet) and [PHP HTTP library](https://github.com/pusher/pusher-http-php). I've done some refactoring of the [new Pusher Python HTTP library](https://github.com/pusher/pusher-http-python/tree/1.0.0) and created a [template](https://github.com/pusher/pusher-http-library-template) showing the recommended README and repo structure for Pusher libraries that interact with our HTTP API.

Finally, I've been looking at the [Pusher JavaScript](https://github.com/pusher/pusher-js) (browser-focused) library. It's a nicely engineered library, but does need to be updated to reflect some modern JavaScript practices. Two things that *should* have been relatively easy are

1. Updating the tooling to be Node-based so we can take advantage of the mass of community solutions available.
2. Add a [UMD wrapper](https://github.com/umdjs/umd) with the main reason being so the library can be more easily used with amazing tools like [webpack](webpack.github.io) and [Browserify](http://browserify.org/).

The need to continue to support IE7 is standing in the way of migrating all the tooling to Node - *we've found that there just isn't a reliable Jasmine 1.3 Runner for Node with older browsers*. **But**, I'm very hopeful we'll be able to get pusher-js into NPM with a UMD wrapper in the very near future since there is [demand for it](https://github.com/pusher/pusher-js/issues/84). What's been holding us back is ensuring we can run our automated tests against the built library with the UMD wrapper.

## <a name="api-pitch">Pusher API Pitch</a>

<img src="/images/2015-q1-retro/api-pitch.png" style="float: right; margin: 20px; width: 175px" />

I'm really excited that we're involved in [BattleHack 2015](https://2015.battlehack.org/). It's been a while since I've been at a hackathon - too long.

Since Pusher are partners we'll need to give an API pitch. So I've spent some time putting together an interactive slide deck for hackathons that gives an idea of what Pusher is, what you can build with it and let's the Pusher evangelist write some code to show off just how easy it is to integrate Pusher into any technology stack.

## <a name="blog">3 Blog Posts + Post Reviews</a>

I love writing blog posts and tutorials so I'm disappointed to have only written one post per month over the last three months.

We recently made SSL available on all plans so I was involved in some of the planning behind that and wrote the [SSL Everywhere announcement post](https://blog.pusher.com/ssl-everywhere/). I also wrote up my [thoughts on PHP UK 2015](https://blog.pusher.com/php-2015-pragmatic-progressive-open/), that I mentioned earlier. Finally I eventually got around to writing up a [Review of Realtime Web Tech Predictions from 2014](http://www.leggetter.co.uk/2015/03/28/realtime-tech-predictions-review.html) which was long overdue.

As well as this I've been fortunate to get to review and provide feedback on a number of Pusher blog posts. My favourites are [How We Built AtomPair, Our Realtime Collaboration Plugin For Atom.IO](https://blog.pusher.com/how-we-built-atom-pair/) by [Jamie Patel](https://twitter.com/jamiepatel), the [Pusher at BattleHack 2015 announcement](https://blog.pusher.com/pusher-battlehack-2015/) and most recently [Porting the Pusher integration tests to Haskell](https://blog.pusher.com/porting-the-pusher-integration-tests-to-haskell/) by [Will Sewell](https://twitter.com/willsewell_) which was a great learning experience.

## <a name="retro">Stats & Retrospective</a>

* 305 minutes spoken for
* 12 StackOverflow answers
* +500 email conversations participated in
* 256 GitHub Commits
* 7 trips & 22 nights away (25% of the quarter)
* ~15.5k miles travelled (16 flights, 23 Taxis, 1 train journey, 2 bus journeys)

Getting up to speed when starting a new job take time. Going back to a similar job is a different experience. But Pusher is a different company to the one I [left back on 2013](http://www.leggetter.co.uk/2013/07/04/leaving-pusher-what-next.html) so it took a little bit of time to get into the swing of things again.

Travel-wise, I'm relatively happy. I don't think I'd want to be away from home more than 25% of the time. Especially since I've two kids of 3.5 years and 6 months who I want to be there for.

I've probably been involved in too many things at once which has resulted in getting a bit less done that what I would have liked.

That said, I'm pleased with my contribution in terms of real-time general knowledge sharing within the company, giving 6 talks whilst representing Pusher and my work on the Pusher libraries.

As mentioned above, I really want to start writing more and following *my developer evangelist motto of Learn. Create. Share*. I also want to continue to improve the developer experience at Pusher.

It's great to be back at Pusher and I'm very much looking forward to our upcoming roadmap week to define the rest of the quarter ahead.

## <a name="q2-plans">Plan for Q2 2015</a>

I'm presently working on getting the **Pusher JavaScript library into NPM** with [@zimbatm](https://twitter.com/zimbatm) and am hopeful that'll be done very soon. From there I'll be able to use tools like webpack and Browserify when I build demos. So, definitely more demos!

**More tutorials and blog posts** are definitely on the cards. From showing how well Pusher integrates with a number of great technology stacks and services through to sharing knowledge on best-practice in using real-time technologies and apps.

I'm going to continue my crusade to make sure that as many people as possible know they have real-time data, know they have a use for a real-time framework or service and are inspired to build amazing real-time features into their existing or new applications.

<a href="https://futureofwebapps.com/london-2015/"><img src="/images/2015-q1-retro/fowa-2015-realtime-tooling.png" style="float: right; margin: 20px; width: 200px" /></a>

I'm excited about talking about the key points to consider when a business is about to embark of offering a Real-Time API at the end of this month at [API Strat / API Days in Berlin](http://apidaysberlin2015.apistrat.com/sessions/architecture-microservices/), 23rd to 24th April.

Something unrelated to Q2, but that I want to give a mention to, is that it's great to be speaking again at [FOWA London](https://futureofwebapps.com/london-2015/) this year. This time I'm going to give a talk on **Tools, Tips and Techniques for Developing Real-time Apps**.

In general, I'll have a much better idea about what's coming up after this week - Pusher roadmap week.

## Closing Off

For those that read this far - well done! I hope sharing this information either provides you with some insight into the type of things you would do in a developer evangelist role or if you are already working in developer evangelism/advocacy/relations you can compare it to what you've done and the things you've achieved so far this year.

**~Learn. Create. Share~**

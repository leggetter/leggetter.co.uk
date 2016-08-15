---
layout: post
status: publish
published: true
title: "Web Development Pic 'n' Mix"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
wordpress_id: 23919
wordpress_url: "https://www.leggetter.co.uk/?p=23919"
date: "2013-07-18 01:21:42 +0100"
date_gmt: "2013-07-18 00:21:42 +0100"
categories:
  - Technology
tags:
  - Yeoman
  - lineman
  - brunch.io
  - developer workflow
  - web toolkit
  - mimosa
  - node.js
permalink: /2013/07/18/web-development-pic-n-mix.html
thumb: /images/thumb/pic-n-mix.jpg
---

<p>Over the past three weeks I've had the opportunity to investigate modern web development tools and I feel a little bit like a kid in a sweet shop. Firstly, I'm excited to be here. Secondly, there's so much to choose from. In the past you may have been able to pick up a selection box containing a few pre-defined dev tool options. Now, there are so many technologies and tools available it's like being in the pic 'n' mix section.</p>

<p><img src="/wp-content/uploads/2013/07/pic-n-mix.jpg" alt="pic-n-mix" width="640" height="349" class="aligncenter size-full wp-image-23921" /><br />
<small><a href="http://www.flickr.com/photos/20989733@N00/61985179/">source</a></small></p>
<p>There are so many tools to choose from when undertaking a web development project that it's difficult to know where to get started. How do you approach choosing what's right for your project? How can you really know without trying them all out?</p>
<p>Let's be honest; very few of us have time to really try out everything.</p>
<p>So, you probably choose techniques, technologies and tools that have similarities to the ones you are familiar with, the ones used and talked about by those you 'follow' and from selective reading and testing.</p>
<blockquote>
<p>"Node.js is trending; we should probably try that out"</p>
<p>"We can now loosely couple our web front-ends from our backends thanks to modern browsers and by building APIs"</p>
<p>"I'm seeing Yeoman mentioned a lot and those guys from Google are involved in it; that must be the way to go"</p>
<p>"I've seen people migrating from TextMate to Sublime; we should be using Sublime".</p>
</blockquote>
<p>From runtime to editor; it's a minefield that has to be navigated quite frequently as technology naturally progresses at an amazing rate.</p>
<p>A lot of us (developers) like to have the choice. We like picking the pieces of technology that suit us. Our development workflow really is created from a pic 'n' mix of tools; from runtimes, to productivity apps, to editors, to build tools, and beyond!</p>
<p>IDEs (Integrated Development Environments) were commonplace in the not too distant past. But now, and for quite some time - in the scripted-language circles I've been in, anyway - there has been little use of IDEs and the choice has been to pic 'n' mix web development tooling. There are obvious benefits in being able to select small tools that do one (or a few things) very well.</p>
<p>Editors: Sublime, TextMate or Vim combined with editor customisations and hooks into the terminal/console represent a common web development setup. The terminal is then used to kick off tasks from running tests to full builds and deployments. Certainly no pointing and clicking.</p>
<p>The real need for effort comes when those tools - executed from the terminal - have to integrate with each other. Scripts have to be written, tested, debugged and managed in the very same way as the code for the product that's being built. It feels like we're spending more and more time playing with tooling and less time creating products. Others seem to agree.</p>
<blockquote class="twitter-tweet"><p>Relatedly: I&#39;m often concerned that the web industry is getting way too hung up on techniques/tooling than the actual product/thing itself.</p>
<p>&mdash; Matt Andrews (@mattpointblank) <a href="https://twitter.com/mattpointblank/statuses/356899458384019456">July 15, 2013</a></p></blockquote>
<p><script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script></p>
<p><small>Also see Matt's post, <a href="http://www.threechords.org/blog/the-web-less-engine-more-gas/">The web: less engine, more gas</a></small></p>
<p>Some developers - and businesses - simply want a set of web development tools, and a runtime stack, that just works and helps productivity as close to "out of the box" as possible. This may be through buying-in to a technology stack such as the ones provided by Microsoft (whether you like it or not, Visual Studio is a solid IDE and developers can be very productive using it) or by using a <strong>web toolkit</strong> which consists of a collection of small tools pre-configured in a way that has been agreed by the toolkit's contributors to be a productive default.</p>
<p>When it comes to front-end web development, the latter can be seen in the likes of <a href="http://yeoman.io">Yeoman</a>, <a href="http://brunch.io/">Brunch</a>, <a href="https://github.com/testdouble/lineman">lineman</a> and <a href="http://mimosajs.com/">Mimosa</a>.</p>
<p>These don't provide editors, but do provide things like:</p>
<ul>
<li>default application structure (skeletons) from templates</li>
<li>scaffolding functionality to help generate common files for common functionality (e.g. models, views, controllers and tests)</li>
<li>development runtime tools (e.g server and logging)</li>
<li>a common build process</li>
</ul>
<p>They also generally provide some sort of plugin or extension support. Exactly what can be customised by these really depends on the toolkit; Yeoman appears to be massively flexible while Mimosa is a little more restrictive.</p>
<p>You could still look upon these toolkits as being too flexible, or as requiring too much additional configuration, but the defaults are consistently being reviewed - Yeoman only at 1.0 release candidate 1.</p>
<p>So, is there still a place for the full blown IDE? Maybe that depends on the technology that an application is being built on; Visual Studio for .NET and IntelliJ, NetBeans or Eclipse for Java versus text editors (TextMate, Sublime and Vim) plus customised tooling for Node.js, Ruby and front-end technologies like JavaScript, CSS, Sass, Less etc.</p>
<p>I'm particularly interested in Yeoman. It's already had great take-up by a community that live on the cutting edge and has had a large number of contributions. It consists of <a href="gruntjs.com">Grunt</a> and <a href="http://bower.io/">Bower</a> which both have a high level of adoption on their own. What interests me is that I can see a number of light weight wrappers being created around these tools to provide more defined (rigid/opinionated) developer workflows that fit certain work environments or where some development processes need to be adhered to; maybe the types of environment that IDEs presently inhabit? This may require an acceptance of Node.js in larger institutions, but I think that's coming and is certainly being helped by Microsoft's adoption of it and incorporation in Windows Azure.</p>
<p><img src="/wp-content/uploads/2013/07/selection-box.jpg" alt="selection-box" width="640" height="425" class="aligncenter size-full wp-image-23924" /><br />
<small><a href="http://www.flickr.com/photos/skrb/5984295645/sizes/z/in/photostream/">source</a></small></p>
<p>Would the wider, more cutting edge community, adopt a more defined workflow if it were proven to help productivity and could demonstrate that using it resulted in quality scalable web applications?</p>
<p>Pic 'n' mix web development tooling is popular right now, but maybe the day will come when a number of proven quality selection box developer toolkits - consisting of the very best of the pic 'n' mix - will return to popularity?</p>

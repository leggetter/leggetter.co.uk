---
layout: post
status: publish
published: true
title: "jQuery UK 2012 Event - don't always use jQuery"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 22726
wordpress_url: "http://www.leggetter.co.uk/?p=22726"
date: "2012-02-19 07:27:48 +0000"
date_gmt: "2012-02-19 07:27:48 +0000"
categories:
  - Technology
tags:
  - jQuery
  - Event
  - jquk
  - api-fanboy
permalink: /2012/02/19/jquery-uk-2012-event-dont-always-use-jquery.html
excerpt: "jQuery is a funny thing; it's made JavaScript coding easy for advanced developers and accessible to web designers, and you could even say that the web designer role has very much changed because of it. It's made web interfaces much richer and interactive. But, it's also made us lazy because it's so easy to use. It's time to take a step back and start thinking about best practices. And sometimes that might mean <em>not using</em> jQuery."
---

<p><em>I started writing this right after the jQuery UK event but have only just found time to finish it off sitting in Stansted airport at 7am.</em></p>
<p>jQuery is a funny thing; it's made JavaScript coding easy for advanced developers and accessible to web designers, and you could even say that the web designer role has very much changed because of it. It's made web interfaces much richer and interactive. But, it's also made us lazy because it's so easy to use. It's time to take a step back and start thinking about best practices. And sometimes that might mean <em>not using</em> jQuery.</p>
<p>I was really pleased to hear <a href="http://twitter.com/codepo8">Christian Heilmann</a>'s talk on moving back to using native methods, rather than always using jQuery (you can read Christian's write-up and get see his slides <a href="http://christianheilmann.com/2012/02/11/jquery-uk-conference-in-oxford-england-slides-audio-impressions-and-notes/">here</a>). His reasons for this were:</p>
<ul>
<li>To encourage education about native browser functionality</li>
<li>Native browser methods can perform better</li>
</ul>
<p>This latter point is of particular interest to me. Whilst at <a href="http://www.caplin.com">Caplin Systems</a> I was part of a development team where performance was critical. We were (they still are) building realtime web libraries and UIs which need to deal with both high frequency of data updates and large data sets displayed within the UI. I met up with <a href="http://twitter.com/fauna5">Rich Chamberlain</a>, Caplin's dev manager, about a month ago and he reminded me of this. So, I set about comparing <code>document.getElementById('someId')</code> with <code>$('#someId')</code> and unsurprisingly the native method was by far superior.</p>
<p>For the results of this, and to test for yourself, see <a href="/2012/02/12/considerations-when-updating-the-dom-to-display-realtime-data.html">Considerations when updating the DOM to display realtime data</a>.</p>
<p>What was surprising was just how much better <code>document.getElementById</code> is. You would assume (I haven't looked at the source) that within the <code>$</code> function that the selector would simply be checked:</p>
<pre><code>$ = function(selector) {
  if( isIdSelector(selector) ) {
    var el = document.getElementById(selector);
    return warpInJQueryStuff(el); // el could be null
  }
  // else …
};
</code></pre>
<p>Ok, it's probably nothing like this. But you get the idea. So, what is it that makes using jQuery comparatively so expensive? My guess is that it's the <code>warpInJQueryStuff</code>. One of the parts of jQuery that makes it so powerful (all those functions you can call after selecting elements, and the chaining functionality e.g.</p>
<pre><code>$('.something')
.doSomething()
.doSomethingElse()
.soOn();
</code></pre>
<p>The same goes when the <code>selector</code> isn't just an <code>id</code> attribute selector i.e. a more advance CSS query.</p>
<pre><code>$ = function(selector) {
  if( isIdSelector(selector) ) {
    //...
  }
  else if( isQuerySelector(selector) ) {
    var els = document.querySelector(selector); //**TODO: check**
    return wrapInjQueryStuff(els);
  }
  // else …
};
</code></pre>
<p>The jQuery library shoots itself in the foot a little bit here because they've added non-CSS selectors (I can't find an example right now but <a href="http://www.google.co.uk/search?ix=teb&amp;sourceid=chrome&amp;ie=UTF-8&amp;q=jquery+non-standard+selectors#sclient=psy-ab&amp;hl=en&amp;safe=off&amp;source=hp&amp;q=jquery+%22non-standard+selectors%22&amp;pbx=1&amp;oq=jquery+%22non-standard+selectors%22&amp;aq=f&amp;aqi=&amp;aql=&amp;gs_sm=3&amp;gs_upl=3450l5414l0l5599l4l4l0l0l0l2l966l1518l5-1.1l2l0&amp;bav=on.2,or.r_gc.r_pw.r_cp.,cf.osb&amp;fp=a16cf6b4817c4ef9&amp;biw=1440&amp;bih=746&amp;ix=teb">a google</a> suggests this is correct). However, this isn't anything that a <code>RegExp</code> couldn't test for and if the jQuery-specific selectors aren't found then the native function can be used. Again, maybe it's the <code>wrapInjQueryStuff</code> that's the problem?</p>
<p>Anyway, the point is: don't always use jQuery. As with anything, consider what you are trying to achieve and if performance matters, or you just want to learn, use the native methods instead. But remember to check for <a href="http://caniuse.com/queryselector">browser support</a>.</p>
<p>If performance matters and you find this type of thing interesting then Doug Neiner's talk on <a href="http://www.slideshare.net/dcneiner/contextual-jquery">Contextual jQuery</a> will probably interest you too.</p>

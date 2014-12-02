---
layout: page
template: default
page_class: "rtw-guide"
status: publish
published: true
title: Real-Time Web Technologies Guide
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 20290
wordpress_url: "http://www.leggetter.co.uk/?page_id=20290"
date: "2011-06-26 12:19:20 +0100"
date_gmt: "2011-06-26 11:19:20 +0100"
categories: []
tags: []
permalink: /real-time-web-technologies-guide/
---

*Note: This page is a work in progress. I plan to update it new technologies as I find them and increase the information on each as I find the time. If you know of a technology that should be included in this guide then please [raise a pull request](https://github.com/leggetter/realtime-web-technologies-guide). If you have any questions please drop me an <a href="mailto:phil@leggetter.co.uk?subject=Real-Time Technology Guide">email me</a>*

**As above, you can contribute to the list by making a pull request to the <a href="https://github.com/leggetter/realtime-web-technologies-guide">Realtime Web Technologies Guide github repo<a>.**

<ul class="toc">
  <li>
    <a href="#hosted-services">Hosted Realtime Services</a>
    <ul>
      <li><a href="#hosted-client">Messaging: with focus on delivery to clients (e.g. Web Browsers)</a></li>
      <li><a href="#hosted-data-sync">Data Synchronisation, Persistence, Full Stack</a></li>
      <li><a href="#hosted-servers">Messaging: with focus on delivery to servers</a></li>
      <li><a href="#hosted-other">Other services: which don&#8217;t clearly fit into any of the above.</a></li>
    </ul>
  </li>
  <li><a href="#self-hosted">Self Hosted Realtime Services</a></li>
  <li><a href="#websocket-client-libraries">WebSocket Client Libraries</a></li>
</ul>

<div id="toc_test"></div>

{% include realtime-web-technologies-guide/guide.md %}

<hr />

{% include disqus.html %}

<script src="/bower_components/contents/dist/contents.min.js"></script>
<script>
(function() {
  var Contents = window.gajus.Contents,
  contents,

  // This example generates a table of contents for all of the headings in the document.
  // Table of contents is an ordered list element.
  contents = Contents({
    articles: $('#content .post').find('h2, h3, h4').get()
  });

  // Append the generated list element (table of contents) to the container.
  var tocEl = document.querySelector('.toc');
  var contentsEl = contents.list();
  contentsEl.className = "toc";
  tocEl.parentNode.replaceChild(contentsEl, tocEl);

  $( '.toc a' ).smoothScroll( {
    afterScroll: function( opts ) {
      window.location.hash = opts.scrollTarget;
    }
  } );
})();
</script>

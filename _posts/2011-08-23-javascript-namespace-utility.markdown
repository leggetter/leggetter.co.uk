---
layout: post
status: publish
published: true
title: JavaScript namespace utility
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 21748
wordpress_url: "http://www.leggetter.co.uk/?p=21748"
date: "2011-08-23 17:09:24 +0100"
date_gmt: "2011-08-23 16:09:24 +0100"
categories:
  - Technology
tags:
  - JavaScript
  - namespace
  - Utilities
  - Libraries
permalink: /2011/08/23/javascript-namespace-utility.html
---

<p>Over the past 10 or so years I've written a lot of JavaScript. From very early on, at <a href="http://www.caplin.com">Caplin Systems</a>, I had to write things in a way which ensured that code was clear, usable, discoverable, reusable, extensible and can easily built upon. One of the concepts that was used was to put code within a namespace. This ensured that you couldn't accidentally override a function in the global <code>window</code> namespace and also meant that the namespace would describe the sort of functionality contained within. I've continued to use this concept in various forms but just realised that I've never actually shared how I do this. So here goes.</p>
<p>It's actually really simple. I've got two functions that I use, and I've recently ported over to the <code>com.pusher</code> namespace since I'm creating demos for my work (and play). The first creates some default namespace objects and then defines a <code>namespace</code> function that can be used from then on to create any other namespace objects.</p>
<pre><code>/**
 * @namespace
 * Top-level namespace to stop namespace clutter.
 */
if(!window["com"]) {
  window["com"] = {};
}

// create pusher ns
if(!com.pusher) {
  com.pusher = {};
}

/**
 * Ensures that a namespace exists.
 * @param {String} namespace The namespace to check for and create if required.
 *
 * @return {Object} The existing or new namespace.
 */
com.pusher.namespace = function(namespace) {
  var parts = namespace.split(".");
  var context = window;
  var nsPath = "";
  for(var i = 0, l = parts.length; i &lt; l; ++i) {
    var name = parts[i];
    if(!context[name]) {
      context[name] = {};
      context[name].__namespace = name;      
    }
    nsPath += name + ".";
    context = context[name];
    if(!context.__namespace) {
      context.__namespace = nsPath.substring(0, nsPath.length-1); // trim off '.'
    }
  }
  return context;
};
</code></pre>
<p>A quick example of this might be:</p>
<pre><code>com.pusher.namespace("my.new.namespace");

my.new.namespace.SomeClass = function() {
};
/* define methods etc. */
</code></pre>
<p>Then you can access the class anywhere using:</p>
<pre><code>var instance = new my.new.namespace.SomeClass();
</code></pre>
<p>The second function that I've only just started to use takes a leaf from <strong>node.js</strong>. It in that it passes in an <code>exports</code> variable which represents the newly created namespace and then you can add items to that namespace.</p>
<p><em>Note: I'd previously called the <code>exports</code> variable called <code>export</code> but it would appear this is a reserved word in Safari &amp; Firefox</em></p>
<pre><code>com.pusher.define = function(namespace, definition) {
  var exports = {};
  definition(exports);

  var nsObject = com.pusher.namespace(namespace);
  for(var thingToexports in exports) {
    nsObject[thingToexports] = exports[thingToexports];
  }
};
</code></pre>
<p>You'll noticed that it uses the <code>com.pusher.namespace</code> function to create the namespace object. The usage of this is then as follows:</p>
<pre><code>com.pusher.namespace("my.new.namespace", function(exports) {

  var SomeClass = function() {
  };
  /* define methods etc. */

  exports.SomeClass = SomeClass;
});
</code></pre>
<p>The class can then be accessed in the same way as shown previously:</p>
<pre><code>var instance = new my.new.namespace.SomeClass();
</code></pre>
<p>I like this last way of doing things as you declare the namespace at the top and wrap everything in a function. You then can pick what you want to expose to the outside world by just adding it to the <code>exports</code> variable.</p>
<p>I'd be interested to hear what you think about this approach. Do you have a better one?</p>

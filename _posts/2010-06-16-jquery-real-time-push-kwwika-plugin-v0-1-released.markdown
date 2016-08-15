---
layout: post
status: publish
published: true
title: jQuery Real-Time Push Kwwika Plugin v0.1 released
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
excerpt: "        \r\n\tKwwika already makes it really easy to add real-time push functionality to any web page or website but we've gone a little bit further to try to make it even easier\_by writing a small but powerful jQuery plugin.\r\n\_\r\nThe jQuery Real-Time Push..."
wordpress_id: 865
wordpress_url: "http://blog.kwwika.com/jquery-real-time-push-kwwika-plugin-v01-relea"
date: "2010-06-16 00:41:00 +0100"
date_gmt: "2010-06-15 23:41:00 +0100"
categories:
  - Twitter
tags:
  - real-time web
  - Kwwika
permalink: "http://blog.kwwika.com/jquery-real-time-push-kwwika-plugin-v01-relea"
---

<p><strong>Update:</strong> Unfortunately Kwwika is no more. But I've created a similar plugin for <a href="http://pusher.com">Pusher</a> who I now work for. You can get the <a href="https://github.com/leggetter/jquery.realtime">realtime jQuery plugin here</a>.</p>
<hr />
<p>Kwwika already makes it really easy to add real-time push functionality to any web page or website but we've gone a little bit further to try to make it <strong>even easier</strong> by writing a small but powerful jQuery plugin.</p>
<p>The <a href="http://wiki.kwwika.com/plugins/jquery-real-time-push-kwwika-plugin">jQuery Real-Time Push Kwwika Plugin</a> allows you to define elements within a web page that you want to be updated with real-time data as soon as it's available. Anybody that has used a jQuery plugin should find our jQuery plugin really simple to use.<br />
<a id="more"></a><a id="more-865"></a><br />
Here's how to use it.</p>
<h3>Register for the Kwwika Beta</h3>
<p>In order to use Kwwika you must first <a href="http://kwwika.com/#getbeta">register</a> so we can set up permissions within the Kwwika system to allow your website/domain to receive real-time push data from Kwwika.</p>
<p>So, register for the <a href="http://kwwika.com/#getbeta">Kwwika Beta programme</a> now.</p>
<h3>Include script tags</h3>
<p>You need to include the core jQuery library, the Kwwika JavaScript API and the jQuery Real-Time Push Kwwika Plugin files in your web page:</p>
<p>[sourcecode language="html"]<br />
&lt;script src=&quot;http://code.jquery.com/jquery-1.4.2.min.js&quot;&gt;&lt;/script&gt;<br />
&lt;script src=&quot;http://api.kwwika.com/latest/&quot;&gt;&lt;/script&gt;<br />
&lt;script src=&quot;http://api.kwwika.com/latest/plugins/jQuery/jquery.kwwika/jquery.kwwika.js&quot;&gt;&lt;/script&gt;<br />
[/sourcecode]</p>
<h3>Define HTML</h3>
<p>You define the topic to be requested from Kwwika by adding an attribute to an HTML element. The default attribute to identify the topic to request is <strong>data-topic</strong>. You identify the value to be placed within the element by adding a <strong>data-field</strong> attribute to the same element. In the example below if an update occurs on the /KWWIKA/TWITTER/SEARCHES/KWWIKA topic with a value for the ScreenName field it will be inserted as the html contents of the first &lt;div&gt; element.</p>
<p>We've decided to use attributes with a prefix of "data-" as the <a href="http://dev.w3.org/html5/spec/Overview.html#custom-data-attribute">present HTML 5 draft suggests custom attributes should use this prefix</a>.</p>
<blockquote class="gmail_quote" style="margin-top: 0px; margin-right: 0px; margin-bottom: 0px; margin-left: 0.8ex; border-left-width: 1px; border-left-color: #cccccc; border-left-style: solid; padding-left: 1ex;"><p><a style="background-color: #ffffaa;" title="custom data attribute" href="http://dev.w3.org/html5/spec/Overview.html#custom-data-attribute"><span style="color: #444444;">Custom data attributes</span></a> are intended to store custom data private to the page or application, for which there are no more appropriate attributes or elements.</p></blockquote>
<p>[sourcecode language="html"]<br />
&lt;html&gt;<br />
    &lt;body&gt;<br />
        &lt;div data-topic=&quot;/KWWIKA/TWITTER/SEARCHES/KWWIKA&quot;<br />
     data-field=&quot;ScreenName&quot;&gt;&lt;/div&gt;<br />
        &lt;div data-topic=&quot;/KWWIKA/TWITTER/SEARCHES/KWWIKA&quot;<br />
     data-field=&quot;Text&quot;&gt;&lt;/div&gt;<br />
    &lt;/body&gt;<br />
&lt;/html&gt;<br />
[/sourcecode]</p>
<h3>Call the jQuery plugin</h3>
<p>You call the jQuery Real-Time Push Kwwika Plugin in the same way you call any other jQuery plugin, by supplying a selector to the jQuery method ($) and calling the kwwika() function.</p>
<p>[sourcecode lang="html"]<br />
&lt;script type=&quot;text/javascript&quot;&gt;<br />
    $(function ()<br />
    {<br />
        $(&quot;div&quot;).kwwika();<br />
    });<br />
&lt;/script&gt;<br />
[/sourcecode]</p>
<h3>Examples</h3>
<p>You can find three examples of how to use the jQuery Real-Time Push Kwwika Plugin from the links below:</p>
<p>The <a style="color: #0033cc; text-decoration: underline;" rel="nofollow" href="http://api.kwwika.com/latest/plugins/jQuery/jquery.kwwika/examples/">jQuery Real-Time Push Kwwika Plugin examples</a> can be found on the API site:<br />
<a style="color: #0033cc; text-decoration: underline;" rel="nofollow" href="http://api.kwwika.com/latest/plugins/jQuery/jquery.kwwika/examples/">http://api.kwwika.com/latest/plugins/jQuery/jquery.kwwika/examples/</a></p>
<h3>Plugin Files</h3>
<p>The plugin files are hosted on our API server. You can either download them and host them yourself or your own server:</p>
<p>Min: <a style="color: #0033cc; text-decoration: underline;" rel="nofollow" href="http://api.kwwika.com/latest/plugins/jQuery/jquery.kwwika/jquery.kwwika.min.js">http://api.kwwika.com/latest/plugins/jQuery/jquery.kwwika/jquery.kwwika.min.js</a></p>
<p>Full: <a style="color: #0033cc; text-decoration: underline;" rel="nofollow" href="http://api.kwwika.com/latest/plugins/jQuery/jquery.kwwika/jquery.kwwika.js">http://api.kwwika.com/latest/plugins/jQuery/jquery.kwwika/jquery.kwwika.js</a></p>
<h3>Plugin Web Page</h3>
<p>The <a href="http://wiki.kwwika.com/plugins/jquery-real-time-push-kwwika-plugin">jQuery Real-Time Push Kwwika Plugi</a>n has a dedicated page on the <a href="http://wiki.kwwika.com">Kwwika Wiki</a>:<br />
<a href="http://wiki.kwwika.com/plugins/jquery-real-time-push-kwwika-plugin">http://wiki.kwwika.com/plugins/jquery-real-time-push-kwwika-plugin</a></p>
<p><a href="http://blog.kwwika.com/jquery-real-time-push-kwwika-plugin-v01-relea">Permalink</a><br />
| <a href="http://blog.kwwika.com/jquery-real-time-push-kwwika-plugin-v01-relea#comment">Leave a comment  »</a></p>

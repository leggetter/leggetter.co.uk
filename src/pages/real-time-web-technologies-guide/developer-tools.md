---
layout: ../../layouts/MarkdownPage.astro
title: "Developer Tools"
---

<h2>Working with WebHooks</h2>
<p>Working with WebHooks exposed from a hosted service can be tricky. Here are some tools that will come in handy.</p>
<h3>Capturing WebHooks</h3>
<p>Sometimes you simply want to capture the WebHook call. There are tools that can help you with that:</p>
<ul>
<li><a href="http://inspectb.in/">Inspectb.in</a></li>
<li><a href="http://requestb.in/">Requestb.in</a></li>
<li><a href="https://www.runscope.com/docs/request-capture">Runscope request capture</a></li>
</ul>
<h3>WebHooks to your local development environment</h3>
<p>When developing against WebHooks exposed by a hosted service you want the WebHook calls from the service to reach your local development environment. In order to do that you need to set the WebHook endpoint to be a publicly visible URL. There are a few tools that help you:</p>
<ol>
<li>Create a public URL</li>
<li>Makes your local development environment temporarily visible via that URL</li>
</ol>
<ul>
<li><a href="http://progrium.com/localtunnel/">localtunnel</a></li>
<li><a href="https://www.runscope.com/docs/passageway">Passageway</a></li>
<li><a href="http://www.ultrahook.com/">UltraHook</a></li>
</ul>

---
layout: page
status: publish
published: true
title: Realtime Hosted Service Latency Stats
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 24271
wordpress_url: "http://www.leggetter.co.uk/?page_id=24271"
date: "2014-01-19 17:03:00 +0000"
date_gmt: "2014-01-19 17:03:00 +0000"
categories: []
tags: []
permalink: /real-time-web-technologies-guide/realtime-hosted-service-latency/
---

<p>This page will show both historical and current latency for a number of Realtime Hosted Services.</p>
<p>The latency is collected and calculated using the code in the <a href="https://github.com/leggetter/realtime-benchmarks">realtime benchmarks repository</a>. The benchmarks are executed on every client which navigates to any page on <a href="http://www.leggetter.co.uk">www.leggetter.co.uk</a>. Latency is calculated based on the round-trip time from triggering an event from the client and then receiving that message back. Therefore the current latency that you will see (on the left, after the benchmarks have completed) is the latency from your web browser <em>right now</em>.</p>

<h3>The Stats</h3>
<p>Please remember that you are only seeing latency for the last few benchmark tests. If the last few visitors to my site were on mobile on a 2G connection or in some remote geographic location then the latency will be very high. If you really want to test latency then I recommend you take a look at the <a href="https://github.com/leggetter/realtime-benchmarks">realtime benchmarks repository</a> and <strong>run the tests in your own controlled environment</strong>.</p>

<table id="results" class="latency-results">
  <thead>
    <tr>
      <td class="times-label" colspan="8">
        Time of results
      </td>
    </tr>
    <tr>
      <td>Service</td>
      <td>Avg.</td>
      <!-- ko foreach: latencyTimestamps -->
      <td class="result-time" data-bind="fromNow: $data, flash"></td>
      <!-- /ko -->
    </tr>
  </thead>
  <tbody data-bind="foreach: latencyResults">
    <tr>
      <td class="service-name">
        <a data-bind="attr: {href:info.url}, text: info.displayName"></a>
      </td>
      <td class="avg-service-latency" data-bind="text:avg"></td>
      <!-- ko foreach: latency -->
      <td class="result" data-bind="text: $data, flash"></td>
      <!-- /ko -->
    </tr>
  </tbody>
</table>
<p><small>Latency times in milliseconds. <em>NaN</em> results indicate that the benchmark did not complete.</small></p>

<h2>Why does latency matter?</h2>

<p>Quite how important latency is really depends the the use case of your application. If you're building a trading application then milliseconds really do matter. However the majority of the use cases for web, mobile and Internet of Things applications actually means that getting data within a second is acceptable.</p>
<h2>Full Historical Stats</h2>
<p>I've been collecting latency stats for some of the services since <strong>Sun Oct 28 2012 12:52:01 GMT+0000 (GMT)</strong>. Over time I plan to have a look at these and do some analysis.</p>

<script src="http://cdnjs.cloudflare.com/ajax/libs/knockout/3.1.0/knockout-min.js"></script>
<script src="http://realtime-latency-stats.herokuapp.com/realtime/client.js"></script>
<script src="http://cdnjs.cloudflare.com/ajax/libs/moment.js/2.6.0/moment.min.js"></script>
<script src="http://leggetter.github.io/realtime-benchmarks-reporting/public/reporter.js"></script>
<link href="http://leggetter.github.io/realtime-benchmarks-reporting/public/styles.css" rel="stylesheet" />

---
layout: ../../layouts/MarkdownPage.astro
title: "Realtime Hosted Service Latency Stats"
---

This page will show both historical and current latency for a number of Realtime Hosted Services.

The latency is collected and calculated using the code in the <a href="https://github.com/leggetter/realtime-benchmarks">realtime benchmarks repository</a>. The benchmarks are executed on every client which navigates to any page on <a href="https://www.leggetter.co.uk">www.leggetter.co.uk</a>. Latency is calculated based on the round-trip time from triggering an event from the client and then receiving that message back. Therefore the current latency that you will see (on the left, after the benchmarks have completed) is the latency from your web browser <em>right now</em>.

### The Stats

Please remember that you are only seeing latency for the last few benchmark tests. If the last few visitors to my site were on mobile on a 2G connection or in some remote geographic location then the latency will be very high. If you really want to test latency then I recommend you take a look at the <a href="https://github.com/leggetter/realtime-benchmarks">realtime benchmarks repository</a> and <strong>run the tests in your own controlled environment</strong>.

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

<small>Latency times in milliseconds. <em>NaN</em> results indicate that the benchmark did not complete.</small>

## Why does latency matter?

Quite how important latency is really depends the the use case of your application. If you're building a trading application then milliseconds really do matter. However the majority of the use cases for web, mobile and Internet of Things applications actually means that getting data within a second is acceptable.

## Full Historical Stats

I've been collecting latency stats for some of the services since <strong>Sun Oct 28 2012 12:52:01 GMT+0000 (GMT)</strong>. Over time I plan to have a look at these and do some analysis.

<script src="//cdnjs.cloudflare.com/ajax/libs/knockout/3.1.0/knockout-min.js"></script>
<script src="//realtime-latency-stats.herokuapp.com/realtime/client.js"></script>
<script src="//cdnjs.cloudflare.com/ajax/libs/moment.js/2.6.0/moment.min.js"></script>
<!-- <script src="http://localhost:5000/reporter.js"></script> -->
<script src="https://realtime-latency-stats.herokuapp.com/reporter.js"></script>
<link href="//leggetter.github.io/realtime-benchmarks-reporting/public/styles.css" rel="stylesheet" />

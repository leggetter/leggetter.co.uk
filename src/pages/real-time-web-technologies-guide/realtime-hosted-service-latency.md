---
layout: ../../layouts/MarkdownPage.astro
title: "Realtime Hosted Service Latency Stats"
description: "Historical notes on the realtime hosted service latency benchmarks that ran on leggetter.co.uk between 2012 and the mid-2010s."
---

**Note: the live latency benchmarks that used to run on this page are no longer
collected** — the reporting service that powered them has been retired. The
methodology and code remain available in the
<a href="https://github.com/leggetter/realtime-benchmarks">realtime benchmarks repository</a>.

## How the benchmarks worked

The latency was collected and calculated using the code in the
<a href="https://github.com/leggetter/realtime-benchmarks">realtime benchmarks repository</a>.
The benchmarks were executed on every client which navigated to any page on
<a href="https://www.leggetter.co.uk">www.leggetter.co.uk</a>. Latency was
calculated based on the round-trip time from triggering an event from the
client and then receiving that message back — so the latency measured was the
latency from the visitor's web browser at that moment.

Stats were collected for a number of realtime hosted services from
<strong>Sun Oct 28 2012</strong> onwards.

## Why does latency matter?

Quite how important latency is really depends on the use case of your
application. If you're building a trading application then milliseconds really
do matter. However the majority of the use cases for web, mobile and Internet
of Things applications actually means that getting data within a second is
acceptable.

If you want to measure latency for services today, take a look at the
<a href="https://github.com/leggetter/realtime-benchmarks">realtime benchmarks repository</a>
and <strong>run the tests in your own controlled environment</strong>.

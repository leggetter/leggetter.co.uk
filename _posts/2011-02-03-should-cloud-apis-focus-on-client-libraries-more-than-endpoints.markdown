---
layout: post
status: publish
published: true
title: Should Cloud APIs Focus on Client Libraries More Than Endpoints?
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 7066
wordpress_url: "http://blog.programmableweb.com/?p=17946"
date: "2011-02-03 08:00:47 +0000"
date_gmt: "2011-02-03 08:00:47 +0000"
categories:
  - Technology
tags:
  - http streaming
  - cloud
  - Facebook
  - websockets
  - Mapping
  - APIs
  - Amazon
  - flickr
  - google maps
  - rest
  - RPC
  - SOAP
  - youtube
permalink: "http://www.programmableweb.com/category/all/news?p=17946"
---

<p><a href="http://www.flickr.com/photos/pagedooley/2511369048/"><img class="imgRight" title="Clouds" src="http://blog.programmableweb.com/wp-content/clouds-thumb.jpg" alt="" width="86" height="73" /></a>Cloud APIs are all about the endpoints: some services follow the current trend of providing a RESTful end point, others use older protocols such as RPC or SOAP, some use newer – push focused – endpoints like WebSockets or HTTP Streaming, others may offer a number of different endpoints to meet different requirements and some just use what seems to be best for a specific job which might mean not strictly following protocol rules. But is providing an endpoint to a service alone good enough? Should a developer really have to care about how a service is built or accessed when they can use a client library?</p>
<p>This post was very much inspired by William Vambenepe’s blog post called <a href="http://stage.vambenepe.com/archives/1712">Cloud APIs are like military parades</a> which focuses on the current trend of REST APIs but it also covers some interesting questions and one very key one:</p>
<p><em>How many developers actually directly access an endpoint and how many access a service through a library?</em></p>
<p>So, should cloud services just be providing endpoints and relying on community, open source and developers to build libraries that make access to their service easier? Should they just provide samples or small helper libraries? Or should a library be provide by the cloud service vendor and be considered a key part of that service?</p>
<p>There may not be right or wrong answers to these question, it may very well depend on the complexity involved in using the service API.</p>
<p><img class="aligncenter size-full wp-image-17940" title="All time top mashups" src="http://blog.programmableweb.com/wp-content/AllTimeTopMashups.png" alt="" width="474" height="256" /></p>
<p>A look at the all time most popular APIs used by mashups in our <a href="http://www.programmableweb.com/apis">API directory</a> unsurprisingly lists Google Maps, Flickr, YouTube, Twitter, Amazon and Facebook. The <a href="http://www.programmableweb.com/mashups/directory/1?sort=popular">most popular mashups</a> listing also confirms this with a heavy focus on the mashups using mapping APIs.</p>
<p>Mapping APIs are quite complex due to the UI aspect of the service and the majority of libraries are provided by the cloud service vendor. Twitter has developed a <a href="http://dev.twitter.com/pages/libraries">large array of libraries</a> built by an “ecosystem” of developers, Facebook provides a suite of <a href="http://developers.facebook.com/docs/sdks">SDKs and Tools</a>, Flickr provides <a href="http://www.flickr.com/services/api/">API Kits</a>, the <a href="http://www.programmableweb.com/api/youtube">YouTube API</a> consists of <a href="http://code.google.com/intl/en/apis/youtube/getting_started.html#player_apis">libraries for visual-oriented functionality</a> and raw access to a data API and finally Amazon offer SDKs for access to AWS APIs and provide <a href="http://aws.amazon.com/code/Product%20Advertising%20API?_encoding=UTF8&amp;jiveRedirect=1">code samples</a> for accessing their product advertising one.</p>
<p>Big cloud API players are clearly making an effort to give developers a running start when using their APIs. In the majority of cases some raw API access is available but samples, SDKs and libraries can be found in abundance and have quite frequently been developed by the company itself.</p>
<p>So, do cloud services offer API endpoints just to meet the needs of a very small percentage of developers who want to make raw calls to an API? Do they do it in order to enforce good development practice? Or is the main benefit that it encourages developers and open source advocates to get involved with a service and built a community? What do you think?</p>
<p>Photo by <a href="http://kevindooley.blogs.com/">Kevin Dooley</a></p>
<p>This <a href="http://blog.programmableweb.com/2011/02/03/should-cloud-apis-focus-on-client-libraries-more-than-endpoints/">post was originally</a> written by me for Programmable Web.</p>

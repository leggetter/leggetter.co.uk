---
layout: post
status: publish
published: true
title: PublishMyData Helps You Set Your Data Free
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "<img src=\"http://blog.programmableweb.com/wp-content/publishmydata.jpg\" alt=\"\" width=\"150\" height=\"35\" class=\"imgRight\" />The number of “as a Service” types continues to grow and we are even seeing services that help you build your own service. PublishMyData falls into this category as it offers Infrastructure as a Service (IaaS) which enables you to offer your Data as a Service (DaaS). The company's focus is to help those with data share it in a standard format and in an accessible way."
wordpress_id: 9363
wordpress_url: "http://blog.programmableweb.com/?p=18909"
date: "2011-04-05 17:00:01 +0100"
date_gmt: "2011-04-05 16:00:01 +0100"
categories:
  - Technology
tags:
  - cloud
  - API
  - uk
  - DaaS
  - DataSift
  - data as a service
  - datasets
  - IaaS
  - Infrastructure as a Service
  - PublishMyData
  - SPARQL
permalink: "http://www.programmableweb.com/category/all/news?p=18909"
---

<p><img src="http://blog.programmableweb.com/wp-content/publishmydata.jpg" alt="" title="Publish My Data" width="150" height="35" class="imgRight" />The number of “as a Service” types continues to grow and we are even seeing services that help you build your own service. PublishMyData falls into this category as it offers Infrastructure as a Service (IaaS) which enables you to offer your Data as a Service (DaaS). The company&#8217;s focus is to help those with data share it in a standard format and in an accessible way.</p>
<p><a href="http://publishmydata.com/">PublishMyData’s website</a> sums up its offering as:</p>
<blockquote><p>We can help you publish accessible, queryable, Linked Data on the Web so that it&#8217;s easy for people to find, understand and re-use.</p>
</blockquote>
<p>This statement not only defines what PublishMyData are trying to achieve but also the point of <a href="http://linkeddata.org/">Linked Data</a>. Linked Data is <a href="http://en.wikipedia.org/wiki/Linked_data">described on Wikipedia</a> as:</p>
<blockquote><p>a method of publishing structured data, so that it can be interlinked and become more useful. It builds upon standard Web technologies, such as HTTP and URIs &#8211; but rather than using them to serve web pages for human readers, it extends them to share information in a way that can be read automatically by computers. This enables data from different sources to be connected and queried.</p>
</blockquote>
<p>Due to the complexity involved in converting any data in any format into Linked Data the publishing process isn’t fully automated at present and there will be some consultancy involved. However, in the longer term there are plans to expose their publishing tools and move towards a much more self-service model: a kind of Content Management System for linked data driven sites.</p>
<p style="text-align: center;"><img class="aligncenter" style="max-width: 800px;" src="http://blog.programmableweb.com/wp-content/PublishMyDataProcess.gif" alt="" width="564" height="253" /></p>
<p>Once the data has been analysed and processed to be more accessible and queryable as Linked Data it can then be made available on a customized portal, including a highly accessible and standardized <a href="http://www.w3.org/TR/rdf-sparql-query/">SPARQL</a> API (a query language for RDF), for the client. In addition it can be hosted, or at least referred to, in the PublishMyData service. If it is made available via PublishMyData it will be listed in their <a href="http://publishmydata.com/datasets">datasets list</a>. Although PublishMyData will have data available directly on their site and through their hosted API it is not aiming to become a data market or data index themselves &#8211; rather an enabling platform for others who want to make their data accessible.</p>
<p>Although it might appear that PublishMyData is a similar service to <a href="http://www.programmableweb.com/api/factual">Factual</a> there are a number of differences. Factual are looking to make their site a destination,  appear to be focusing on offering a service to host the data, defining the subject matter and get users using their API. PublishMyData in comparison are looking to offer a service that lets data owners offer their own portal where they can keep ownership of their data and control access to their API. Factual does not appear to be offering access to its data in a standardized format (i.e. something defined by the W3C) and its <a href="http://www.programmableweb.com/api/factual">Factual API</a> uses a customized query syntax, whilst PublishMyData is trying to offer access to data in a potentially more standardized format (Linked Data/RDF) and offer filtering and querying using a standard query language (SPARQL).</p>
<p>PublishMyData offers a <a href="http://publishmydata.com/sparql">nifty tool</a> that lets you execute SPARQL queries and once you are happy with your query you can use the relevant SPARQL API endpoint to access the data from code. The API can return data in a number of formats including xml, json, text, csv and tsv. The data is also accessible following the basic <a href="http://www.ietf.org/proceedings/69/slides/geopriv-4.pdf">HTTP-dereferencing</a> approach that is core to Linked Data.  In addition, the company is working on adding in some non-SPARQL, more &#8216;traditional&#8217; HTTP API functions, to make some common functionality available without the user needing any knowledge of SPARQL which should really reduce the barrier to entry.</p>
<p>PublishMyData is a relatively new service and Bill Roberts of PublishMyData explains their focus for the past few months:</p>
<blockquote><p>Our main focus over the last couple of months has been setting up some trials with data owners to publish their data.  We&#8217;re aiming mainly at the UK public sector at the moment and in the process of setting up a few client-specific sites built on our platform.</p>
</blockquote>
<p>More recently PublishMyData has teamed up with Aberdeen City council and a government department to publish their data. Bill explains further:</p>
<blockquote><p>So far most of the government focus on open data and transparency has been around public spending, but these examples should move the discussion on a bit.  With the council [Aberdeen City] we&#8217;re looking at how linked data can help the communication between citizens and council, and how the delivery of public services can be enhanced.  With the government department, we&#8217;ll be presenting some important &#8217;state of the nation&#8217; statistics in a way that should be a lot more accessible than the usual government approaches.</p>
</blockquote>
<p>The <a href="http://linkeddata.aberdeencity.gov.uk/">Aberdeen Council PublishMyData portal</a> has just been made available and the number of DataSets will grow over time.</p>
<p>PublishMyData is constantly on the lookout for useful data so if you have any data that you would like to share or if you want some data but can’t get hold of it then PublishMyData would like you to <a href="http://publishmydata.com/about-us">get in touch</a>. If you are interested in finding out more about Linked Data then the PublishMyData website, this <a href="http://dailyjs.com/2010/11/26/linked-data-and-javascript/">post on Linked Data and JavaScript</a> and Learn Linked Data (by PublishMyData) are good starting points.</p>
<p>Originally written by me for <a href="http://blog.programmableweb.com/2011/04/05/publishmydata-helps-you-set-your-data-free/">Programmable Web</a></p>

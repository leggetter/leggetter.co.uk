---
layout: post
status: publish
published: true
title: Response.Redirect in Windows Azure
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 356
wordpress_url: "http://www.leggetter.co.uk/?p=356"
date: "2009-10-06 22:21:13 +0100"
date_gmt: "2009-10-06 21:21:13 +0100"
categories:
  - thoughts
tags: []
permalink: /2009/10/06/response-redirect-in-windows-azure.html
---

<p>I've recently created an application called <a href="http://getgravatar.com">GetGravatar</a> that allows you to update your Twitter profile picture with your Gravatar. Once I'd set up my <a href="http://blog.smarx.com/posts/custom-domain-names-in-windows-azure">Windows Azure custom domain name</a> I decided I wanted the web address for this new service site to be without "www" as seems to be all the rage (to keep the web address short). So, I looked at doing a Response.Redirect to catch any attempts to access my domain with "www" in it. I'm very sure that there are better ways of doing this but I added the following to my Site.master file:</p>
<pre name="code" class="csharp">
    if (Request.Url.ToString().StartsWith("http://www."))
    {
        Response.StatusCode = (int)System.Net.HttpStatusCode.MovedPermanently;
        string responseUrl = Request.Url.ToString().Replace("http://www.", "http://");
        Response.Redirect(responseUrl, true);
    }
</pre>
<p>So, if somebody types in http://www.getgravatar.com (see it works) or anything with a "www." in the URL they will be redirected to a non-www page. However, the redirect seemed to go to the correct URL but with port 20000. I've no idea why this is so I had to add a special case in to remove the port.</p>
<pre name="code" class="csharp">
    if (Request.Url.ToString().StartsWith("http://www."))
    {
        Response.StatusCode = (int)System.Net.HttpStatusCode.MovedPermanently;
        string responseUrl = Request.Url.ToString().Replace("http://www.", "http://");
        responseUrl = responseUrl.Replace(":20000", "");
        Response.Redirect(responseUrl, true);
    }
</pre>
<p>I've not read up to see if this is expected but I thought it was quite unexpected and may be of use to somebody else in the future.</p>

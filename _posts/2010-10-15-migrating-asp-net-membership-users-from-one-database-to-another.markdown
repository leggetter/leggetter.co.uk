---
layout: post
status: publish
published: true
title: Migrating ASP.NET Membership users from one database to another
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "\n        \n\tThe\_Configuring a Website that Uses Application Services page does cover\_Copying User Accounts from Development to Production but doesn&#039;t go into all that much detail. It really skips over the topic and starts talking about the Applica..."
wordpress_id: 1917
wordpress_url: "http://leggetter.posterous.com/migrating-aspnet-membership-users-from-one-da"
date: "2010-10-15 16:06:49 +0100"
date_gmt: "2010-10-15 16:06:49 +0100"
categories: []
tags: []
permalink: /2010/10/15/migrating-asp-net-membership-users-from-one-database-to-another.html
---


<p>
	The <a href="http://www.asp.net/hosting/tutorials/configuring-a-website-that-uses-application-services-cs">Configuring a Website that Uses Application Services page</a> does cover <b>Copying User Accounts from Development to Production</b> but doesn&#39;t go into all that much detail. It really skips over the topic and starts talking about the <b>ApplicationId</b> and <b>applicationName</b> problem that a lot of people have had trouble with. This problem has <a href="http://weblogs.asp.net/scottgu/archive/2006/04/22/Always-set-the-_2200_applicationName_2200_-property-when-configuring-ASP.NET-2.0-Membership-and-other-Providers.aspx">also been covered</a> by Scott Gu back in 2006. The part it skips over is that you can actually migrate your users and applications if you use the <a href="http://www.microsoft.com/downloads/en/details.aspx?familyid=56e5b1c5-bf17-42e0-a410-371a838e570a&amp;displaylang=en">Database Publishing Wizard</a>. But it doesn&#39;t tell you what to do if you don&#39;t want to use the Database Publishing Wizard. Here&#39;s what I did:

<ol>
<li>In SQL Server Managment Studio right-click on your database and select &quot;Tasks -&gt; Generate Scripts...&quot;. The SQL Server Scripts Wizard dialog will appear.</li>
<li>Click &quot;Next&quot;, select the database with the Application Services, <a href="http://asp.net">ASP.NET</a> Membership tables installed and click &quot;Next&quot; again</li>
<li>In the &quot;Choose Script Options&quot; dialog change the &quot;Script Create&quot; option to False and change &quot;Script Data&quot; to True. The click &quot;Next&quot;.</li>
<li>In the &quot;Choose Object Types&quot; dialog select just &quot;Tables&quot; and click &quot;Next&quot;.</li>
<li>In the &quot;Choose Tables&quot; dialog select all the tables with a &quot;aspnet_&quot; prefix. In my dialog this went from &quot;aspnet_Applications&quot; to &quot;aspnet_WebEvent_Events&quot;. Click &quot;Next&quot;.</li>
<li>You can then generate the script which you will then run on the destination database to a variety of destinations including a new query window in SQL Server Management Studio or a .sql text file by clicking &quot;Finish&quot; (potentially twice).</li>
</ol>
<div>The next steps simply involve running SQL Server Management Studio and connecting to you destination database and running the generated script against it. This obviously assumes that you have the Application Services installed already.</div>
<p />
<div>When I ran my generated SQL on the destination server I did get a few &quot;Violation of PRIMARY KEY constraint&quot; errors. To be honest I just ignored them since my application and users had been successfully inserted into the necessary tables and I could login using the expected credentials.</div>
<p />
<div>If you do have any questions about this please just post a comment.</div>

---
layout: post
status: publish
published: true
title: How to sign an unsigned DLL
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
wordpress_id: 37
wordpress_url: "https://www.leggetter.co.uk/2007/12/07/how-to-sign-an-unsigned-dll.html"
date: "2007-12-07 11:37:30 +0000"
date_gmt: "2007-12-07 10:37:30 +0000"
categories:
  - Technology
tags:
  - .NET
permalink: /2007/12/07/how-to-sign-an-unsigned-dll.html
---

<p>Taken from: <a href="http://forums.microsoft.com/MSDN/showpost.aspx?postid=420884&amp;siteid=1">http://forums.microsoft.com/MSDN/showpost.aspx?postid=420884&amp;siteid=1</a></p>
<blockquote><p>
Step 1: Dis-assemble the assembly<br />
ildasm myTest.dll /out:myTest.il</p>
<p>Step 2: Re-Assemble using your strong-name key<br />
ilasm myTest.il /res:myTest.res /dll /key:myTest.snk /out:myTestSN.dll</p>
<p>This code work perfectly to assign strong name.</p>
<p>for verification you can use following command,<br />
sn -vf myTestSN.dll</p></blockquote>

---
layout: post
status: publish
published: true
title: "C# - Get Windows Temporary Directory"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 8
wordpress_url: "http://www.leggetter.co.uk/2007/02/02/get-windows-temporary-directory.html"
date: "2007-02-02 10:25:48 +0000"
date_gmt: "2007-02-02 09:25:48 +0000"
categories:
  - Technology
tags:
  - "C# Snippets"
  - .NET
  - Software Development
  - "C#"
permalink: /2007/02/02/get-windows-temporary-directory.html
---

<p>Once you know it you'll probably never forget it...but wait, this is the second time I've <a href="http://www.google.com/search?q=C%23+get+temp+folder+path" title="Google search for C# get temp folder path">googled</a> for this. I'd best post how  you "<strong>get the Windows temporary directory using C#</strong>"!</p>

```csharp
string tempPath = System.IO.Path.GetTempPath();
```

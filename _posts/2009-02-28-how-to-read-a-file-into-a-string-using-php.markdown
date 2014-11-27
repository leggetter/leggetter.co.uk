---
layout: post
status: publish
published: true
title: How to read a file into a string using PHP
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 163
wordpress_url: "http://www.leggetter.co.uk/?p=163"
date: "2009-02-28 14:39:04 +0000"
date_gmt: "2009-02-28 13:39:04 +0000"
categories:
  - Technology
tags:
  - Software Development
  - PHP
  - code snippet
  - Uncategorized
permalink: /2009/02/28/how-to-read-a-file-into-a-string-using-php.html
---

<pre name="code" class="php">
	function ReadFile($filename)
	{
		$fh = fopen($filename, 'r');
		$theData = fread($fh, filesize($filename));
		fclose($fh);
		return $theData;
	}
</pre>

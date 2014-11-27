---
layout: post
status: publish
published: true
title: Linkstation NAS Folder share with Windows Vista
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 30
wordpress_url: "http://www.leggetter.co.uk/2007/05/22/linkstation-nas-folder-share-with-windows-vista.html"
date: "2007-05-22 22:32:59 +0100"
date_gmt: "2007-05-22 21:32:59 +0100"
categories:
  - Technology
tags:
  - Hardware
permalink: /2007/05/22/linkstation-nas-folder-share-with-windows-vista.html
---

<p>I've just treated myself to a new laptop and one of the first things I found was that I couldn't access my NAS (Network Attached Storage) with windows explorer using <a href="http://www.google.com/url?sa=t&amp;ct=res&amp;cd=1&amp;url=http%3A%2F%2Fwww.microsoft.com%2Fwindows%2Fproducts%2Fwindowsvista%2Feditions%2Fultimate%2Fdefault.mspx&amp;ei=h29TRpG2CIuiQaqFjb8J&amp;usg=AFrqEzezb3WTOY3v6MaN8kZI9E0Qu_7z6g&amp;sig2=Exz7HCiNeuFOlEnUzML5mw">Windows Vista Ultimate</a>. Vista could see the NAS on the network but whenever I tried to access it I would get prompted for a password. However, I have no password set for accessing to the NAS.</p>
<p><img src="http://linuxdevices.com/files/misc/buffalo_linkstation-thm.jpg" title="Linkstation" alt="Linkstation" align="middle" height="125" width="80" /> <strong>+ </strong><img src="http://img.microsoft.com/library/media/1033/windows/images/products/windowsvista/editions/icon_vistaultimate.gif" title="Windows Vista Ultimate" alt="Windows Vista Ultimate" align="middle" height="185" width="138" /> <strong>= Why won't it work?</strong></p>
<p>So, after a bit of googling I came across a patch that updates a registry setting to allow Vista to navigate to network shares on the Linkstation NAS machine. I downloaded the <a href="http://www.buffalotech.com/support/downloads/">patch for discontinued Linkstation</a> because that's the model I have. Patches are also available for other Linkstation versions via the <a href="http://www.buffalotech.com/support/downloads/">Buffalo download page</a>.</p>
<p>It's also worth noting that the best place for Buffalo downloads is the <a href="http://www.buffalotech.com/support/downloads/">http://www.buffalotech.com/support/downloads/</a> url and NOT the http://www.buffalo-technology.com/support/downloads/ url. The first of the options seems to have more available; e.g. it has the patch for the Linkstation.</p>

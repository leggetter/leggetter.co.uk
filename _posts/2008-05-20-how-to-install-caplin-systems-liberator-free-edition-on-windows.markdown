---
layout: post
status: publish
published: true
title: "How to install Caplin Systems' Liberator Free Edition on Windows"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "<h3>Liberator FE</h3>\r\nI work for <a href=\"http://www.caplin.com/\">Caplin Systems</a> who have recently released <a href=\"http://www.freeliberator.com\">Liberator FE</a> which is the Free Edition of their real time <a href=\"http://www.freeliberator.com/comet/\">Comet</a> server product.\r\n<blockquote>Liberator is the most performant and fully-featured server currently available for streaming real-time data to web pages. The technology behind many of the world's leading financial trading portals, it is now available FREE for evaluation and non-commercial use.</blockquote>\r\nIn this post I will detail my experiences when installing Liberator FE on Windows with an aim to being able to create a <a href=\"http://en.wikipedia.org/wiki/Rich_Internet_application\">RIA</a> Client that consumes data from a Capin <a href=\"http://www.freeliberator.com/documentation/DataSourceJava/javadoc/index.html\">DataSource</a>.\r\n<blockquote>Liberator Free Edition comes with a comprehensive client library for integrating with Ajax or Flex, RIAs, a Java server library for connecting to sources of data and building application logic, and full documentation.</blockquote>\r\n<a title=\"Liberator FE on CentOS Linux distribution\" href=\"http://www.leggetter.co.uk/wp-content/uploads/2008/05/liberatorfecentos.png\"><img src=\"http://www.leggetter.co.uk/wp-content/uploads/2008/05/liberatorfecentos.png\" alt=\"Liberator FE on CentOS Linux distribution\" width=\"449\" height=\"363\" /></a>\r\n"
wordpress_id: 44
wordpress_url: "http://www.leggetter.co.uk/2008/05/20/how-to-install-caplin-systems-liberator-free-edition-on-windows.html"
date: "2008-05-20 22:50:20 +0100"
date_gmt: "2008-05-20 21:50:20 +0100"
categories:
  - Technology
tags:
  - Caplin Systems
  - Software Development
permalink: /2008/05/20/how-to-install-caplin-systems-liberator-free-edition-on-windows.html
---

<h3>Liberator FE</h3>
<p>I work for <a href="http://www.caplin.com/">Caplin Systems</a> who have recently released <a href="http://www.freeliberator.com">Liberator FE</a> which is the Free Edition of their real time <a href="http://www.freeliberator.com/comet/">Comet</a> server product.</p>
<blockquote><p>Liberator is the most performant and fully-featured server currently available for streaming real-time data to web pages. The technology behind many of the world's leading financial trading portals, it is now available FREE for evaluation and non-commercial use.</p></blockquote>
<p>In this post I will detail my experiences when installing Liberator FE on Windows with an aim to being able to create a <a href="http://en.wikipedia.org/wiki/Rich_Internet_application">RIA</a> Client that consumes data from a Capin <a href="http://www.freeliberator.com/documentation/DataSourceJava/javadoc/index.html">DataSource</a>.</p>
<blockquote><p>Liberator Free Edition comes with a comprehensive client library for integrating with Ajax or Flex, RIAs, a Java server library for connecting to sources of data and building application logic, and full documentation.</p></blockquote>
<p><a title="Liberator FE on CentOS Linux distribution" href="/wp-content/uploads/2008/05/liberatorfecentos.png"><img src="/wp-content/uploads/2008/05/liberatorfecentos.png" alt="Liberator FE on CentOS Linux distribution" width="449" height="363" /></a><br />
<a id="more"></a><a id="more-44"></a></p>
<h3>How to Install Liberator FE on Windows</h3>
<p>Liberator FE will not run directly on Windows. The only way to acheive this in any way if you don't have a Linux server handy is to run it on a Virtual Machine. The following sections explain how to get the pieces of software that you need and how to install Liberator FE on Windows.</p>
<h4>VM Player</h4>
<p>VMWare provide a free VMPlayer to allow you to run virtual machine images. Download it <a href="http://www.vmware.com/products/player/">here</a>. Alternatively you can use <a href="http://www.vmware.com/products/player/">VMServer</a>. Both are free to use but make sure you read through the licence agreement.</p>
<p>Installing the player is as simple as double clicking on the downloaded file and following the installation wizard.</p>
<h4>Download Virtual Machine Image</h4>
<p>Once you have the player downloaded and installed you will need a Linux Virtual Machine image so that you can install Liberator FE.</p>
<p>There are a variety of places to get a VMWare image. I found a <a href="http://www.thoughtpolice.co.uk/vmware/#centos5.1">Linux CentOS Image</a> via the <a href="http://www.vmware.com/appliances/">Virtual Appliance Marketplace</a>.</p>
<h4>Run the Virtual Machine Image</h4>
<p>The VM Image will most probably be in a compressed archive so extract it. The image can the be opened using the VMPlayer by selecting the Open option and navigating to the directory with the VM Image and double clicking on the image file that will be visible.</p>
<p>There will most probably be some operating system setup steps to go through but using the Centos image that I chose this took less than 2 minutes.</p>
<p>At this point it's probably worth taking a note of the IP Address of the VM is for the Liberator FE registration. To do this enter <em>ifconfig eth0</em>. If that doesn't work you might need to enter the full path the the <em>/sbin/ifconfig eth0</em>.</p>
<h4>Download Liberator FE</h4>
<p>Open up a web browser in the VMWare Player (Guest OS) and go to <a href="http://www.freeliberator.com">http://www.freeliberator.com</a>, fill in the details (remember to use the IP Address we got above) and download.</p>
<h4>Install Liberator FE</h4>
<p>Move the downloaded Liberator FE installer to an install location and run the script which will install to a new <em>LiberatorFE</em> folder:<br />
<em>./LiberatorFE-4.4.12-1-i686-pc-linux-gnu.sh</em></p>
<p>When prompted enter the licence information that you used when you registered on <a href="http://www.freeliberator.com">http://www.freeliberator.com</a>. You will also be asked for port information. Since this is a clean OS install you should be able to use the default ports so just hit enter when prompted to choose ports. The default HTTP port is 8080 which we'll be using in our next step.</p>
<h4>Start the Liberator</h4>
<p>Navigate to the <em>/LiberatorFE/etc/</em> directory and run <em>./rttpd start</em>.</p>
<p>To ensure that the Liberator has started up open up a web browser within the VM and navigate to <em>http://localhost:8080</em> (substitute 8080 for your HTTP port if you didn't choose the default. I chose 4040 just to be different). You should see the Liberator FE Status Page which means you have successfully installed Liberator FE on Windows.</p>
<h3>References</h3>
<ul>
<li><a href="http://www.freeliberator.com/">Liberator FE</a></li>
<li><a href="http://www.freeliberator.com/documentation/Caplin_Liberator_4.4_FE_Getting_Started_Guide/HTMLdoc/">Liberator FE Getting Started Guide</a></li>
<li><a href="http://www.vmware.com">VMWare</a></li>
<li><a href="http://www.thoughtpolice.co.uk/vmware/">ThoughtPolice VMWare</a></li>
</ul>

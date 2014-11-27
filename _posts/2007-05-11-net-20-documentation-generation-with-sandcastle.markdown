---
layout: post
status: publish
published: true
title: .NET 2.0 Documentation Generation with Sandcastle
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "I've been aware of Microsoft's documentation generation system called Sandcastle for a while now but only recently have I had a chance to use it.\r\n\r\n<a href=\"http://www.sandcastledocs.com/Wiki%20Pages/Home.aspx\" title=\"Microsoft Sandcastle\"><img src=\"http://www.codeplex.com/SHFB/Project/FileDownload.aspx?DownloadId=2696\" title=\"Microsoft Sandcastle\" alt=\"Microsoft Sandcastle\" border=\"0\" height=\"138\" width=\"141\" /></a>\r\n\r\nWith <a href=\"http://ndoc.sourceforge.net/\">NDoc</a> all but dead (see <a href=\"http://www.kynosarges.de/NDoc.html\">NDoc 2.0 Alpha</a>) Sandcastle is now one of very few free alternatives that I could find to generate documentation from my coding comments. However, it did take a bit of searching and playing around to get things working.\r\n\r\n"
wordpress_id: 21
wordpress_url: "http://www.leggetter.co.uk/2007/05/11/net-20-documentation-generation-with-sandcastle.html"
date: "2007-05-11 13:02:59 +0100"
date_gmt: "2007-05-11 12:02:59 +0100"
categories:
  - Technology
tags:
  - .NET
  - Software Development
permalink: /2007/05/11/net-20-documentation-generation-with-sandcastle.html
---

<p>I've been aware of Microsoft's documentation generation system called Sandcastle for a while now but only recently have I had a chance to use it.</p>
<p><a href="http://www.sandcastledocs.com/Wiki%20Pages/Home.aspx" title="Microsoft Sandcastle"><img src="http://www.codeplex.com/SHFB/Project/FileDownload.aspx?DownloadId=2696" title="Microsoft Sandcastle" alt="Microsoft Sandcastle" border="0" height="138" width="141" /></a></p>
<p>With <a href="http://ndoc.sourceforge.net/">NDoc</a> all but dead (see <a href="http://www.kynosarges.de/NDoc.html">NDoc 2.0 Alpha</a>) Sandcastle is now one of very few free alternatives that I could find to generate documentation from my coding comments. However, it did take a bit of searching and playing around to get things working.</p>
<p><a id="more"></a><a id="more-21"></a></p>
<p>You need the following core applications:</p>
<ul>
<li><a href="http://www.sandcastledocs.com">Microsoft Sandcastle</a></li>
<li><a href="http://www.codeplex.com/SHFB">Sandcastle Help File Builder</a></li>
</ul>
<p>You may also need:</p>
<ul>
<li><a href="http://www.microsoft.com/downloads/details.aspx?FamilyID=00535334-c8a6-452f-9aa0-d597d16580cc&amp;DisplayLang=en">HTML Help Workshop and Documentation</a></li>
</ul>
<p>Once you've installed all three of these things you will need to ensure that each of your projects is creating XML Documents when then build. This can be done by viewing the properties of each of your projects in Visual Studio 2005 (right-click on the project and select "Properties", select "Build" and ensure the "XML Documentation file" checkbox is checked.</p>
<p><img src="/wp-content/uploads/2007/05/xmlcheckbox.gif" alt="XML documentation file checkbox" /></p>
<p>Once you've ensured this checkbox is checked you'll need to build your solution so the XML documents are generated.</p>
<p>Now open the Sandcastle Help File Builder application and you should be able to select Project -&gt; New Project from Visual Studio Project...</p>
<p>Select and open up your Visual Studio solution and you should see the "Assemblies to Document" area filled with the project assemblies that belong to your solution. Now you need to populate the Build -&gt; Dependencies section with all the dependencies of your projects. You can add full folders, single files or GAC dependencies using the buttons at the bottom of the "Documentation Assembly Dependencies" dialog.</p>
<p><img src="/wp-content/uploads/2007/05/add_dependencies.gif" alt="add dependencies" /></p>
<p>Finally update the Paths -&gt; HtmlHelp1xCompilerPath, Paths -&gt; SandcastlePath and Paths -&gt; OutputPath to the installation of the HTML Help Workshop location, Sandcastle location and your documentation output folder location respectively.</p>
<p>Click the build button or select Documentation -&gt; Build Project and your documentation should eventually be build in your selected OutputPath.</p>

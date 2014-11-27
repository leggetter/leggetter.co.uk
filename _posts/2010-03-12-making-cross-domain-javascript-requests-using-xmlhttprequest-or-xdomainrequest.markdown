---
layout: post
status: publish
published: true
title: Making cross domain JavaScript requests using XMLHttpRequest or XDomainRequest
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "Cross domain requests (also known as <a href=\"http://www.w3.org/TR/access-control/\">Cross Origin Resource Sharing</a>) can be made using JavaScript without trickery, as far as I can tell, in <strong>Firefox 3.5</strong>, <strong>Safari</strong>,<strong> Google Chrome</strong> and <strong>Internet Explorer 8</strong>. This is done with all browsers except IE8 using a standard <a href=\"http://www.w3.org/TR/XMLHttpRequest/\">XMLHttpRequest</a> object. The only\_thing required to notify the browser that JavaScript is allowed to make this request is for the server to send a <a href=\"http://www.w3.org/TR/2008/WD-access-control-20080912/#access-control-allow-origin\">Access-Control-Allow-Origin</a> response header. Internet Explorer 8 uses an object called <a href=\"http://msdn.microsoft.com/en-us/library/cc288060(VS.85).aspx\">XDomainRequest</a> and requires the same HTTP header. If the value of the header is * then requests are allowed from all domains. You can be more restrictive if required.\r\n"
wordpress_id: 741
wordpress_url: "http://www.leggetter.co.uk/?p=741"
date: "2010-03-12 18:19:23 +0000"
date_gmt: "2010-03-12 18:19:23 +0000"
categories:
  - Technology
tags:
  - JavaScript
  - Cross Domain
  - XmlHttpRequest
  - XDomainRequest
permalink: /2010/03/12/making-cross-domain-javascript-requests-using-xmlhttprequest-or-xdomainrequest.html
---

<p>Cross domain requests (also known as <a href="http://www.w3.org/TR/access-control/">Cross Origin Resource Sharing</a>) can be made using JavaScript without trickery, as far as I can tell, in <strong>Firefox 3.5</strong>, <strong>Safari</strong>,<strong> Google Chrome</strong> and <strong>Internet Explorer 8</strong>. This is done with all browsers except IE8 using a standard <a href="http://www.w3.org/TR/XMLHttpRequest/">XMLHttpRequest</a> object. The only thing required to notify the browser that JavaScript is allowed to make this request is for the server to send a <a href="http://www.w3.org/TR/2008/WD-access-control-20080912/#access-control-allow-origin">Access-Control-Allow-Origin</a> response header. Internet Explorer 8 uses an object called <a href="http://msdn.microsoft.com/en-us/library/cc288060(VS.85).aspx">XDomainRequest</a> and requires the same HTTP header. If the value of the header is * then requests are allowed from all domains. You can be more restrictive if required.<br />
<a id="more"></a><a id="more-741"></a><br />
I took the code that I'll use below from this <a href="http://arunranga.com/examples/access-control/">CORS in action page</a> but I couldn't find the code required to make this work in Internet Explorer so I've had to modify things a bit.</p>
<h2>See it in action</h2>
<p><script type="text/javascript" src="/js/xss/simple.js"></script></p>
<form id="controlsToInvoke" action="">
<p>
            <input type="button" value="Click to Invoke Another Site" onclick="callOtherDomain()" />
        </p>
</p></form>
<div id="textDiv">
        The information below (when it appears) has been fetched using cross-site XHR.
    </div>
<h2>The code</h2>
<p>[html]<br />
&lt;script type=&quot;text/javascript&quot;&gt;</p>
<p>        var isIE8 = window.XDomainRequest ? true : false;<br />
        var invocation = createCrossDomainRequest();<br />
        var url = 'http://www.phobos7.co.uk/research/xss/simple.php';        </p>
<p>        function createCrossDomainRequest(url, handler)<br />
        {<br />
            var request;<br />
            if (isIE8)<br />
            {<br />
                request = new window.XDomainRequest();<br />
            }<br />
            else<br />
            {<br />
                request = new XMLHttpRequest();<br />
            }<br />
            return request;<br />
        }</p>
<p>        function callOtherDomain()<br />
        {<br />
            if (invocation)<br />
            {<br />
                if(isIE8)<br />
                {<br />
                    invocation.onload = outputResult;<br />
                    invocation.open(&quot;GET&quot;, url, true);<br />
                    invocation.send();<br />
                }<br />
                else<br />
                {<br />
                    invocation.open('GET', url, true);<br />
                    invocation.onreadystatechange = handler;<br />
                    invocation.send();<br />
                }<br />
            }<br />
            else<br />
            {<br />
                var text = &quot;No Invocation TookPlace At All&quot;;<br />
                var textNode = document.createTextNode(text);<br />
                var textDiv = document.getElementById(&quot;textDiv&quot;);<br />
                textDiv.appendChild(textNode);<br />
            }<br />
        }</p>
<p>        function handler(evtXHR)<br />
        {<br />
            if (invocation.readyState == 4)<br />
            {<br />
                if (invocation.status == 200)<br />
                {<br />
                    outputResult();<br />
                }<br />
                else<br />
                {<br />
                    alert(&quot;Invocation Errors Occured&quot;);<br />
                }<br />
            }<br />
        }</p>
<p>        function outputResult()<br />
        {<br />
            var response = invocation.responseText;<br />
            var textDiv = document.getElementById(&quot;textDiv&quot;);<br />
            textDiv.innerHTML += response;<br />
        }<br />
    &lt;/script&gt;</p>
<p>    &lt;form id=&quot;controlsToInvoke&quot; action=&quot;&quot;&gt;<br />
        &lt;p&gt;<br />
            &lt;input type=&quot;button&quot; value=&quot;Click to Invoke Another Site&quot; onclick=&quot;callOtherDomain()&quot; /&gt;<br />
        &lt;/p&gt;<br />
    &lt;/form&gt;</p>
<p>    &lt;div id=&quot;textDiv&quot;&gt;<br />
        The information below (when it appears) has been fetched using cross-site XHR.<br />
    &lt;/div&gt;<br />
[/html]</p>
<p>And this is the code on the server</p>
<p>[php]<br />
&lt;?php<br />
	header('Content-type: text/html');<br />
    header('Access-Control-Allow-Origin: *');<br />
	$uri = 'http'. ($_SERVER['HTTPS'] ? 's' : null) .'://'. $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];<br />
	echo('&lt;p&gt;This information has come from &lt;a href=&quot;' . $uri . '&quot;&gt;' . $uri . '&lt;/a&gt;&lt;/p&gt;');<br />
?&gt;<br />
[/php]</p>

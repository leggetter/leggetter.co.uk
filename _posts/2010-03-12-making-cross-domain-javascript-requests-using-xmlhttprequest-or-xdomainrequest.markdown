---
layout: post
status: publish
published: true
title: Making cross domain JavaScript requests using XMLHttpRequest or XDomainRequest
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "https://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "https://www.leggetter.co.uk"
excerpt: "Cross domain requests (also known as <a href=\"http://www.w3.org/TR/access-control/\">Cross Origin Resource Sharing</a>) can be made using JavaScript without trickery, as far as I can tell, in <strong>Firefox 3.5</strong>, <strong>Safari</strong>,<strong> Google Chrome</strong> and <strong>Internet Explorer 8</strong>. This is done with all browsers except IE8 using a standard <a href=\"http://www.w3.org/TR/XMLHttpRequest/\">XMLHttpRequest</a> object. The only\_thing required to notify the browser that JavaScript is allowed to make this request is for the server to send a <a href=\"http://www.w3.org/TR/2008/WD-access-control-20080912/#access-control-allow-origin\">Access-Control-Allow-Origin</a> response header. Internet Explorer 8 uses an object called <a href=\"http://msdn.microsoft.com/en-us/library/cc288060(VS.85).aspx\">XDomainRequest</a> and requires the same HTTP header. If the value of the header is * then requests are allowed from all domains. You can be more restrictive if required.\r\n"
wordpress_id: 741
wordpress_url: "https://www.leggetter.co.uk/?p=741"
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

<script type="text/javascript" src="/js/xss/simple.js"></script>
<form id="controlsToInvoke" action="">
<p>
  <input type="button" value="Click to Invoke Another Site" onclick="callOtherDomain()" />
</p>
</form>
<div id="textDiv">
  The information below (when it appears) has been fetched using cross-site XHR.
</div>

<h2>The code</h2>

```
<script>
  var isIE8 = window.XDomainRequest ? true : false;
  var invocation = createCrossDomainRequest();
  var url = 'https://leggetter-cors.herokuapp.com/';
  function createCrossDomainRequest(url, handler) {
    var request;
    if (isIE8) {
      request = new window.XDomainRequest();
      }
      else {
        request = new XMLHttpRequest();
      }
    return request;
  }

  function callOtherDomain() {
    if (invocation) {
      if(isIE8) {
        invocation.onload = outputResult;
        invocation.open("GET", url, true);
        invocation.send();
      }
      else {
        invocation.open('GET', url, true);
        invocation.onreadystatechange = handler;
        invocation.send();
      }
    }
    else {
      var text = "No Invocation TookPlace At All";
      var textNode = document.createTextNode(text);
      var textDiv = document.getElementById("textDiv");
      textDiv.appendChild(textNode);
    }
  }

  function handler(evtXHR) {
    if (invocation.readyState == 4)
    {
      if (invocation.status == 200) {
          outputResult();
      }
      else {
        alert("Invocation Errors Occured");
      }
    }
  }

  function outputResult() {
    var response = invocation.responseText;
    var textDiv = document.getElementById("textDiv");
    textDiv.innerHTML += response;
  }
</script>
<form id="controlsToInvoke" action="">
    <p>
        <input type="button" value="Click to Invoke Another Site" onclick="callOtherDomain()" />
    </p>
</form>
<div id="textDiv">
    The information below (when it appears) has been fetched using cross-site XHR.
</div>
```

<p>And this is the code on the server</p>

```php
<?php
  header('Content-type: text/html');
  header('Access-Control-Allow-Origin: *');
  $uri = 'http'. ($_SERVER['HTTPS'] ? 's' : null) .'://'. $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
  echo('<p>This information has come from <a href="' . $uri . '">' . $uri . '</a></p>');
```

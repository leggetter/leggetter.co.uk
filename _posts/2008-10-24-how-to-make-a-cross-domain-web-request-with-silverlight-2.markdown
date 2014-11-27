---
layout: post
status: publish
published: true
title: How to make a cross domain web request with SilverLight 2
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "To make a cross domain web request with SilverLight 2 really isn't that tough. I did have some problems with RC0 but I have no idea why. I just tried writing a little app to do this and it worked straight away.\r\n"
wordpress_id: 60
wordpress_url: "http://www.leggetter.co.uk/?p=60"
date: "2008-10-24 12:16:18 +0100"
date_gmt: "2008-10-24 12:16:18 +0100"
categories:
  - thoughts
tags:
  - .NET
  - Internet
  - .NET
  - Software Development
  - silverlight
  - "C#"
  - crossdomain
permalink: /2008/10/24/how-to-make-a-cross-domain-web-request-with-silverlight-2.html
---

<p>To make a cross domain web request with SilverLight 2 really isn't that tough. I did have some problems with RC0 but I have no idea why. I just tried writing a little app to do this and it worked straight away.<br />
<a id="more"></a><a id="more-60"></a></p>
<p>Here's the code. It's obviously part of a full solution containing a Web Application and a SilverLight Application project. I've also <a href="/wp-content/uploads/2008/10/silverlightcrossdomainapplication.zip">uploaded it</a>.</p>
<h2>Useful Information:</h2>
<ul>
<li>You <strong>can not</strong> do a cross domain request over HTTPS.</li>
<li>You <strong>can</strong> do a cross domain request over HTTP.</li>
<li>To be able to make the cross domain request the server that you are making the request to needs to have either (requires clarification) <a href="/crossdomain.xml"> crossdomain.xml</a> and/or <a href="/clientaccesspolicy.xml">clientaccesspolicy.xml</a> in the root of the webserver.</li>
</ul>
<h2>Resources/links:</h2>
<div>
<ul>
<li><a href="http://silverlight.net/forums/p/35194/106059.aspx#106059">SilverLight.net forum post on making a WCF cross domain request</a></li>
<li><a href="http://timheuer.com/blog/archive/2008/04/06/silverlight-cross-domain-policy-file-snippet-intellisense.aspx">Cross domain policy file helpers for Visual Studio</a> - addes intellisense for the XML files</li>
<li><a href="http://www.franksworld.com/Utilities/CrossDomainPolicyChecker/Default.aspx">Online cross domain policy file checker</a></li>
<li><a href="/wp-content/uploads/2008/10/silverlightcrossdomainapplication.zip">Silverlight cross domain web request example solution</a></li>
<li><a href="/crossdomain.xml">Example clientpolicy.xml</a> file<a href="/clientaccesspolicy.xml"></a></li>
<li><a href="/clientaccesspolicy.xml">Example clientaccesspolicy.xml</a> file</li>
</ul>
</div>
<h2>The code:</h2>
<p>[csharp]<br />
private void RequestButton_Click(object sender, RoutedEventArgs e)<br />
{<br />
    try<br />
    {<br />
        // Create and being making the request/getting the response<br />
        HttpWebRequest request = (HttpWebRequest)WebRequest.Create(new Uri("http://www.leggetter.co.uk/"));<br />
        request.BeginGetResponse(HandleResponse, request);<br />
    }<br />
    catch (Exception ex)<br />
    {<br />
        Debug.WriteLine(ex);<br />
    }<br />
}</p>
<p>private void HandleResponse(IAsyncResult result)<br />
{<br />
    try<br />
    {<br />
        // Finish getting the response and then read the response in chunks<br />
        HttpWebRequest request = (HttpWebRequest)result.AsyncState;<br />
        HttpWebResponse response = (HttpWebResponse)request.EndGetResponse(result);</p>
<p>        StringBuilder readText = new StringBuilder();<br />
        using (Stream responseStream = response.GetResponseStream())<br />
        {<br />
            byte[] buffer = new byte[1024];<br />
            int read = responseStream.Read(buffer, 0, buffer.Length);<br />
            while (read > 0)<br />
            {<br />
                readText.Append(Encoding.UTF8.GetString(buffer, 0, read));<br />
                read = responseStream.Read(buffer, 0, buffer.Length);<br />
            }<br />
        }</p>
<p>        // Display the response text<br />
        Dispatcher.BeginInvoke(delegate()<br />
        {<br />
            ResponseText.Text = readText.ToString();<br />
        });<br />
    }<br />
    catch (Exception ex)<br />
    {<br />
        Debug.WriteLine(ex);<br />
    }<br />
}<br />
[/csharp]</p>

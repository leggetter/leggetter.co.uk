---
layout: post
status: publish
published: true
title: A Real Time Rich Internet Application (RTRIA) Example
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "I've just had an article published in the latest <a href=\"http://msdn.microsoft.com/en-gb/aa570311.aspx\">UK MSDN Flash newsletter</a> on <strong>How to consume real-time data in a Silverlight RIA</strong>. As part of writing up the article I developed a sample <a title=\"Real-Time Rich Internet Application\" href=\"http://www.leggetter.co.uk/2009/10/29/real-time-rich-internet-applications-rtria.html\">Real-Time Rich Internet Application (RTRIA)</a> that consumes real-time data from the <a href=\"http://apiwiki.twitter.com/Streaming-API-Documentation\">Twitter real-time data feed</a>. I also put together my first ever <a href=\"http://www.leggetter.co.uk/2009/11/03/a-real-time-rich-internet-application-rtria-example.html#screencast\">screencast</a>. So, you can start by <a href=\"http://www.leggetter.co.uk/2009/11/03/a-real-time-rich-internet-application-rtria-example.html#code\">getting hold of the code</a> or <a href=\"http://www.leggetter.co.uk/2009/11/03/a-real-time-rich-internet-application-rtria-example.html#screencast\">watching the screencast</a>.\r\n\r\n<a name=\"code\"></a>\r\n<h2>The Code</h2>\r\nFirst, and this is <strong>Important</strong>:\r\n<div class=\"important\">To get the sample application to stream real-time data from the Twitter real-time feed you will need to <a href=\"http://www.leggetter.co.uk/2009/10/30/using-fiddler-to-trick-silverlight-into-allowing-a-crossdomain-web-request.html\">use Fiddler to trick Silverlight into allowing a crossdomain Web Request</a>.</div>\r\n\r\nNow that you are aware of that, you will also need the Silverlight development environment. You can get everything you need via the <a href=\"http://silverlight.net/getstarted/\">Silverlight Getting Started page</a>.\r\n\r\nYou've now got everything you need to run the <em>RTRIA</em> example. To run the sample application you should set the <em>MSDNFlashRTRIAExample.Web</em> project as the startup project and the <em>MSDNFlashRTRIAExampleTestPage.html</em> page as the startup page.\r\n\r\n[caption id=\"attachment_488\" align=\"alignnone\" width=\"335\" caption=\"Setting up the solution to run the application\"]<img class=\"size-full wp-image-488\" title=\"Setting up the solution to run the application\" src=\"http://www.leggetter.co.uk/wp-content/uploads/2009/11/SetupForRunning.png\" alt=\"Setting up the solution to run the application\" width=\"335\" height=\"264\" />[/caption]\r\n\r\nIf you'd like to find out a bit more about the code then read on. If you'd rather jump straight into the code you can download it from the <a href=\"http://code.google.com/p/tweetstreamer/\">TweetStreamer Google Code project</a>.\r\n"
wordpress_id: 423
wordpress_url: "http://www.leggetter.co.uk/?p=423"
date: "2009-11-03 20:12:45 +0000"
date_gmt: "2009-11-03 20:12:45 +0000"
categories:
  - Technology
tags:
  - silverlight
  - real-time web
  - Twitter
  - RTRIA
  - real-time data
  - real-time
  - MSDN
permalink: /2009/11/03/a-real-time-rich-internet-application-rtria-example.html
---

<p>I've just had an article published in the latest <a href="http://msdn.microsoft.com/en-gb/aa570311.aspx">UK MSDN Flash newsletter</a> on <strong>How to consume real-time data in a Silverlight RIA</strong>. As part of writing up the article I developed a sample <a title="Real-Time Rich Internet Application" href="/2009/10/29/real-time-rich-internet-applications-rtria.html">Real-Time Rich Internet Application (RTRIA)</a> that consumes real-time data from the <a href="http://apiwiki.twitter.com/Streaming-API-Documentation">Twitter real-time data feed</a>. I also put together my first ever <a href="/2009/11/03/a-real-time-rich-internet-application-rtria-example.html#screencast">screencast</a>. So, you can start by <a href="/2009/11/03/a-real-time-rich-internet-application-rtria-example.html#code">getting hold of the code</a> or <a href="/2009/11/03/a-real-time-rich-internet-application-rtria-example.html#screencast">watching the screencast</a>.</p>
<p><a name="code"></a></p>
<h2>The Code</h2>
<p>First, and this is <strong>Important</strong>:</p>
<div class="important">To get the sample application to stream real-time data from the Twitter real-time feed you will need to <a href="/2009/10/30/using-fiddler-to-trick-silverlight-into-allowing-a-crossdomain-web-request.html">use Fiddler to trick Silverlight into allowing a crossdomain Web Request</a>.</div>
<p>Now that you are aware of that, you will also need the Silverlight development environment. You can get everything you need via the <a href="http://silverlight.net/getstarted/">Silverlight Getting Started page</a>.</p>
<p>You've now got everything you need to run the <em>RTRIA</em> example. To run the sample application you should set the <em>MSDNFlashRTRIAExample.Web</em> project as the startup project and the <em>MSDNFlashRTRIAExampleTestPage.html</em> page as the startup page.</p>
<p>[caption id="attachment_488" align="alignnone" width="335" caption="Setting up the solution to run the application"]<img class="size-full wp-image-488" title="Setting up the solution to run the application" src="/wp-content/uploads/2009/11/SetupForRunning.png" alt="Setting up the solution to run the application" width="335" height="264" />[/caption]</p>
<p>If you'd like to find out a bit more about the code then read on. If you'd rather jump straight into the code you can download it from the <a href="http://code.google.com/p/tweetstreamer/">TweetStreamer Google Code project</a>.<br />
<a id="more"></a><a id="more-423"></a></p>
<h3>The streaming connection</h3>
<p>The following extracts of code may be slightly modified but that has been done to be able to explain what the code does in general a bit better.</p>
<p>The following extract is used to establish a connection to the Twitter real-time data stream using a <a href="http://msdn.microsoft.com/en-us/library/system.net.httpwebrequest(VS.95).aspx">HttpWebRequest</a>. The important thing to note is the use of <code>request.AllowReadStreamBuffering = false;</code> which is required since we are requesting a streaming feed. Without setting the <a href="http://msdn.microsoft.com/en-us/library/system.net.httpwebrequest.allowreadstreambuffering(VS.95).aspx">AllowReadStreamBuffering</a> property to <code>false</code> the <code>ConnectionResponseCallback</code> callback will not be invoked because the response will be continuously buffering.</p>
<p>Since the Twitter real-time data stream requires authentication, and we can't set <a href="http://msdn.microsoft.com/en-us/library/system.net.webrequest.credentials(VS.95).aspx">Credentials</a> on the <code>HttpWebRequest</code> in Silverlight, the browser will prompt the user for a username and password.<br />
[csharp]<br />
private const string SPRITZER_URL = &quot;http://stream.twitter.com/1/statuses/sample.json&quot;;</p>
<p>/// &lt;summary&gt;<br />
/// Starts the connection to the Twitter real-time data stream.<br />
/// &lt;/summary&gt;<br />
public void Connect()<br />
{<br />
    this.InternalConnectionStatus = ConnectionStatus.Connecting;</p>
<p>    try<br />
    {<br />
        HttpWebRequest request = (HttpWebRequest)WebRequest.Create(new Uri(SPRITZER_URL));<br />
        request.AllowReadStreamBuffering = false;<br />
        request.BeginGetResponse(ConnectionResponseCallback, request);<br />
    }<br />
    catch (Exception ex)<br />
    {<br />
        Debug.WriteLine(ex);<br />
        this.InternalConnectionStatus = ConnectionStatus.Disconnected;<br />
    }<br />
}<br />
[/csharp]</p>
<p>Within the callback method we ensure that we are connected and then call the <code>ReadResponseStream</code> method which will not return until we call <code>Disconnect()</code>.</p>
<p>[csharp]<br />
/// &lt;summary&gt;<br />
/// Called when the initial connection has been established.<br />
/// &lt;/summary&gt;<br />
private void ConnectionResponseCallback(IAsyncResult asynchronousResult)<br />
{<br />
    try<br />
    {<br />
        HttpWebRequest request = (HttpWebRequest)asynchronousResult.AsyncState;<br />
        using (HttpWebResponse response = (HttpWebResponse)request.EndGetResponse(asynchronousResult))<br />
        {<br />
            if (response.StatusCode == HttpStatusCode.OK)<br />
            {<br />
                this.InternalConnectionStatus = ConnectionStatus.Connected;</p>
<p>                this.ReadResponseStream(request, response);</p>
<p>                if (this.InternalConnectionStatus != ConnectionStatus.Disconnecting)<br />
                {<br />
                    // unexpected status<br />
                    Debug.WriteLine(&quot;unexpected connection status: &quot; + this.InternalConnectionStatus);<br />
                }<br />
            }<br />
            else<br />
            {<br />
                Debug.WriteLine(&quot;unexpected status code: &quot; + response.StatusCode);<br />
            }<br />
        }</p>
<p>        this.InternalConnectionStatus = ConnectionStatus.Disconnected;<br />
    }<br />
    catch (Exception ex)<br />
    {<br />
        Debug.WriteLine(ex);<br />
    }<br />
}<br />
[/csharp]</p>
<p>In the <code>ReadResponseStream</code> method we continually read the stream until we are interrupted by the user setting the connection status to a value other than <code>ConnectionStatus.Connected</code>, by calling the <code>Disconnect()</code> method, or an exception is thrown whilst reading from the <code>stream</code>. For each read from the stream we parse the data to get the tweets from the real-time data feed in <a href="http://json.org/">JSON</a> format.</p>
<p>[csharp]<br />
/// &lt;summary&gt;<br />
/// Reads the information received from the Twitter real-time data stream.<br />
/// &lt;/summary&gt;<br />
private void ReadResponseStream(HttpWebRequest request, HttpWebResponse response)<br />
{<br />
    byte[] buffer = new byte[65536];<br />
    using (Stream stream = response.GetResponseStream())<br />
    {<br />
        while (this.InternalConnectionStatus == ConnectionStatus.Connected)<br />
        {<br />
            int read = stream.Read(buffer, 0, buffer.Length);<br />
            UTF8Encoding encoding = new UTF8Encoding();<br />
            string data = encoding.GetString(buffer, 0, read);<br />
            ParseResponseChunk(data);<br />
        }</p>
<p>        // need to call request.Abort or the the thread will block at the end of<br />
        // the using block.<br />
        request.Abort();<br />
    }<br />
}<br />
[/csharp]<br />
The <code>ParseResponseChunk</code> checks the data it's passed and ensures that the data contains at least one full status message (tweet). I'll not go into the details of that here since it's just a matter of string parsing.</p>
<p><small>I chose to use the JSON format simply because the content passed over the wire is smaller than the XML feed. This should mean that the application has to do less work to read all the data. What we really should also do is benchmark the deserialisation of JSON against the deserialisation of XML to see which performs best within a Silverlight application.<br />
</small></p>
<h3>Deserialising the JSON</h3>
<p>The following JavaScript JSON snipped shows an example of a single Tweet that we get back from the Twitter real-time data feed.<br />
[javascript]<br />
{<br />
    &quot;in_reply_to_status_id&quot;:9999999,<br />
    &quot;in_reply_to_user_id&quot;:00000000,<br />
    &quot;favorited&quot;:false,<br />
    &quot;in_reply_to_screen_name&quot;:&quot;leggetter&quot;,<br />
    &quot;text&quot;:&quot;@leggetter Wow! A Real-Time Rich Internet Application (RTRIA)&quot;,<br />
    &quot;id&quot;:2820354600,<br />
    &quot;created_at&quot;:&quot;Fri Nov 4 09:39:33 +0000 2009&quot;,<br />
    &quot;truncated&quot;:false,<br />
    &quot;source&quot;:&quot;&lt;a href=\&quot;http:\/\/tweetdeck.com\/\&quot;&gt;TweetDeck&lt;\/a&gt;&quot;<br />
}<br />
[/javascript]</p>
<p>The JSON can be deserialised as an instance of a C# class using the <a href="http://msdn.microsoft.com/en-us/library/system.runtime.serialization.datacontractattribute(VS.95).aspx">DataContract</a> attribute on the class and the <a href="http://msdn.microsoft.com/en-us/library/system.runtime.serialization.datamemberattribute(VS.95).aspx">DataMember</a> attributes on properties.<br />
[csharp]<br />
using System;<br />
using System.Runtime.Serialization.Json;<br />
using System.Runtime.Serialization;<br />
using System.ComponentModel;</p>
<p>namespace TweetStreamer<br />
{<br />
    [DataContract]<br />
    public class StatusMessage : IStatusMessage, INotifyPropertyChanged<br />
    {<br />
        [DataMember(Name = &quot;text&quot;)]<br />
        public string Text {get;set}<br />
    }<br />
}<br />
[/csharp]</p>
<p>A single Tweet, or in TweetStreamer a <code>StatusMessage</code>, can be deserialised using an instance of the <a href="http://msdn.microsoft.com/en-us/library/system.runtime.serialization.json.datacontractjsonserializer(VS.95).aspx">DataContractJsonSerializer</a>.<br />
[csharp]<br />
/// &lt;summary&gt;<br />
/// Creates a single message from json string.<br />
/// &lt;/summary&gt;<br />
/// &lt;param name=&quot;messageData&quot;&gt;The message data.&lt;/param&gt;<br />
/// &lt;returns&gt;&lt;/returns&gt;<br />
private static IStatusMessage CreateMessageFromJsonString(string messageData)<br />
{<br />
    Debug.WriteLine(String.Format(&quot;Creating StatusMessage for: {0}&quot;, messageData));</p>
<p>    IStatusMessage message = null;</p>
<p>    using (MemoryStream stream = new MemoryStream(UTF8Encoding.UTF8.GetBytes(messageData)))<br />
    {<br />
        DataContractJsonSerializer ser = new DataContractJsonSerializer(typeof(StatusMessage));<br />
        message = ser.ReadObject(stream) as StatusMessage;<br />
    }</p>
<p>    if (string.IsNullOrEmpty(message.Id))<br />
    {<br />
        message = null;<br />
        Debug.WriteLine(&quot;message had no ID. Assuming to be a delete message so nulling message object&quot;);<br />
    }</p>
<p>    return message;<br />
}<br />
[/csharp]</p>
<h3>Binding the data to the grid</h3>
<p>To bind the data to a DataGrid the grid needs to be defined in XAML. In addition we can specify the properties on the <code>StatusMessage</code> that we want to bind to columns. In the XAML below we are binding the <code>CreatedAtString</code> property to a Time column, a <code>User.ScreenName</code> to a User column, and a <code>Text</code> property to a Message column. Notice the cool binding of <code>User.ScreenName</code>. The <code>StatusMessage.User</code> property returns an instance of another class and we are actually binding to a property on the returned class.<br />
[xml]<br />
&lt;data:DataGrid Grid.Row=&quot;0&quot; x:Name=&quot;Tweets&quot; AutoGenerateColumns=&quot;False&quot;&gt;<br />
    &lt;data:DataGrid.Columns&gt;<br />
        &lt;data:DataGridTextColumn Header=&quot;Time&quot;<br />
            Binding=&quot;{Binding CreatedAtString}&quot; /&gt;<br />
        &lt;data:DataGridTextColumn Header=&quot;User&quot;<br />
            Binding=&quot;{Binding User.ScreenName}&quot; /&gt;<br />
        &lt;data:DataGridTextColumn Header=&quot;Message&quot;<br />
            Binding=&quot;{Binding Text}&quot; /&gt;<br />
    &lt;/data:DataGrid.Columns&gt;<br />
&lt;/data:DataGrid&gt;<br />
[/xml]<br />
Next, the code to set up the binding and registering for <code>StatusMessage</code> updates using the <code> StatusMessageReceived</code> event. As you many have noticed, the <code>StatusMessage</code> object implements the <a href="http://msdn.microsoft.com/en-us/library/system.componentmodel.inotifypropertychanged(VS.95).aspx">INotifyPropertyChanged</a> interface. This was used so that we could add each <code>StatusMessage</code> to an <a href="http://msdn.microsoft.com/en-us/library/ms668604(VS.95).aspx">ObservableCollection&lt;T&gt;</a> and then bind it to a <a href="http://msdn.microsoft.com/en-us/library/system.windows.controls.datagrid(VS.95).aspx">DataGrid</a> to display the Tweets in real-time.<br />
[csharp]<br />
Connection _twitterConnection;<br />
ObservableCollection&lt;IStatusMessage&gt; _messages = new ObservableCollection&lt;IStatusMessage&gt;();<br />
public MainPage()<br />
{<br />
    InitializeComponent();</p>
<p>    Tweets.ItemsSource = _messages;</p>
<p>    _twitterConnection = new Connection();<br />
    _twitterConnection.StatusMessageReceived += new Connection.OnStatusMessageReceivedEventHandler<br />
        (twitterConnection_StatusMessageReceived);<br />
    _twitterConnection.Connect();<br />
}<br />
[/csharp]<br />
Finally, whenever we get a <code>StatusMessageReceived</code> callback we need to add the new <code>StatusMessage</code> to the <code>ObservableCollection<T></code> collection. <em>This has to be done on the UI thread and via the <code>Tweets.ItemsSource</code> property or the UI will not update.</em><br />
[csharp]<br />
/// &lt;summary&gt;<br />
/// Status message received event handler.<br />
/// &lt;/summary&gt;<br />
/// &lt;param name=&quot;sender&quot;&gt;&lt;/param&gt;<br />
/// &lt;param name=&quot;args&quot;&gt;&lt;/param&gt;<br />
void twitterConnection_StatusMessageReceived(object sender, IStatusMessageReceivedEventArgs args)<br />
{<br />
    Dispatcher.BeginInvoke(() =&gt;<br />
        AddMessage(args.Message)<br />
    );<br />
}</p>
<p>/// &lt;summary&gt;<br />
/// Adds a message to the observable message list which updates the UI.<br />
/// &lt;/summary&gt;<br />
/// &lt;param name=&quot;message&quot;&gt;&lt;/param&gt;<br />
void AddMessage(IStatusMessage message)<br />
{<br />
    ObservableCollection&lt;IStatusMessage&gt; messageList = ((ObservableCollection&lt;IStatusMessage&gt;)Tweets.ItemsSource);<br />
    messageList.Insert(0, message);<br />
}<br />
[/csharp]<br />
Hopefully this will have helped you understand how the Twitter real-time data stream is consumed and an example of how you can use it within a <strong>Real-Time Rich Internet Application</strong>. Now, why now <a href="http://code.google.com/p/tweetstreamer/">download the TweetStreamer library and example application</a> and have a play.</p>
<div class="information"><strong>Limitations</strong>: Although I've seen the sample application perform reasonably well I've also seen it perform quite poorly. How well it performs will depend on the machine running the application and the frequency of the updates from the real-time Twitter stream. In later posts I'll provide information on how to improve performance by making changes to the client code and I'll also go into what can be done on the server.</div>
<h3>Download</h3>
<p>You can download the source from the <a href="http://code.google.com/p/tweetstreamer/">TweetStreamer Google Code project</a>.<br />
<a name="screencast"></a></p>
<h2>Screencast</h2>
<p>This screencast was supposed to be short but ended up being just shy of 10 minutes. In it I provide some technical detail of how I built the application, show the basics of how Fiddler is used to give access to the Twitter real-time data stream, and give a demo of the application.<br />
<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" width="625" height="505" codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,40,0"><param name="allowFullScreen" value="true" /><param name="allowscriptaccess" value="always" /><param name="src" value="http://www.youtube.com/v/5T_jiZCzg4U&amp;hl=en&amp;fs=1&amp;rel=0&amp;hd=1" /><param name="allowfullscreen" value="true" /><embed type="application/x-shockwave-flash" width="625" height="505" src="http://www.youtube.com/v/5T_jiZCzg4U&amp;hl=en&amp;fs=1&amp;rel=0&amp;hd=1" allowscriptaccess="always" allowfullscreen="true"></embed></object></p>

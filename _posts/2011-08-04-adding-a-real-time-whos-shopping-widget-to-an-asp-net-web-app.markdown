---
layout: post
status: publish
published: true
title: "Adding a real-time &quot;Who's shopping?&quot; widget to an ASP.NET Web App"
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
wordpress_id: 21703
wordpress_url: "http://blog.pusherapp.com/2011/8/3/adding-a-real-time-who-s-shopping-widget-to-an-asp-net-web-app"
date: "2011-08-04 01:00:00 +0100"
date_gmt: "2011-08-04 00:00:00 +0100"
categories:
  - Technology
tags:
  - .NET
  - "C#"
  - real-time web
  - ASP.NET MVC
  - real-time
  - ASP.NET
  - pusher
permalink: "http://blog.pusherapp.com/2011/8/3/adding-a-real-time-who-s-shopping-widget-to-an-asp-net-web-app"
---

<p>In our last ASP.NET post, <a href="http://blog.pusher.com/2011/6/25/the-easiest-way-to-add-real-time-functionality-to-an-asp-net-e-commerce-application">The easiest way to add real-time functionality to an ASP.NET e-commerce application</a>, I demonstrated how to add realtime stock level updates and notifications to an ASP.NET e-commerce application. In this post I'm going to show how to add a "Who's shopping?" widget to the same application. The purpose of this widget is to show other users that interest in the product they are viewing is high and that, in combination with the realtime stock levels, will encourage them to make a purchase before the product sells out.</p>
<p>In this tutorial I'll show how to:</p>
<ul>
<li>subscribe to a presence channel</li>
<li>authenticate a subscription to a channel</li>
<li>provide Pusher with additional information about a user</li>
<li>display presence information on a product page for the "Who's shopping?" widget</li>
</ul>
<p>If you are desperate to see the demo in action you can see the <a href="http://realtimewebstore.apphb.com/">Real-Time Web Store demo here</a>.</p>
<h2>Pusher Presence</h2>
<p>To achieve the "Who's shopping?" functionality I'm going to be using a feature in Pusher called <a href="http://pusher.com/docs/client_api_guide/client_channels#subscribe-presence-channels">presence</a>. Presence provides you with additional information about a channel you are subscribed to so that you know:</p>
<ul>
<li>who is subscribed to that channel</li>
<li>when new users subscribe</li>
<li>when existing users unsubscribe (by either actually unsubscribing or navigating away from the page).</li>
</ul>
<p>We are going to have a presence channel per product so that we know who is viewing each product.</p>
<h2>User Info &amp; Authentication</h2>
<h3>Subscribing to a presence channel</h3>
<p>You subscribe to a presence channel in the same way that you do to any other channel but the name of the channel must have a <code>presence-</code> prefix. Presence channels are normal channels with two additions; authentication and presence information. With this in mind we are just going to update our application to use a presence channel.</p>
<p>The JavaScript that makes the subscription in our Razor view looks like this:</p>
<pre><code>var productId = "@Model.ProductId";
var pusher = new Pusher("APP_KEY");
var channel = pusher.subscribe("presence-" + productId);
</code></pre>
<p>We also need to update the code in our <code>StoreController</code> to publish our stock events on the new presence channel:</p>
<pre><code>var stockEvent = new StockUpdatedEvent(model, socketId);
ObjectPusherRequest request = new ObjectPusherRequest("presence-" + stockEvent.ProductId, "stockUpdated", stockEvent);
_provider.Trigger(request);
</code></pre>
<p><em>Note: If you are continuing where we left off in our last blog post there are a final couple of updates that are required to change the app to use the latest version of the Pusher JavaScript API. We recently released version 1.9 which introduced <a href="http://blog.pusher.com/2011/7/12/connections-states">new connection state functionality</a> and also a new <code>connection</code> object. So, update your Pusher script tag as follows:</em></p>
<pre><code>&lt;script src="http://js.pusherapp.com/1.9/pusher.js"&gt;&lt;/script&gt;
</code></pre>
<p><em>And you'll also need to update any pieces of code that access the <code>socket_id</code> via the <code>Pusher</code> instance. It should now be accessed via the new <code>connection</code> object as follows:</em></p>
<pre><code>var socketId = pusher.connection.socket_id;
</code></pre>
<h3>Getting User information</h3>
<p>If Pusher is to send events about users subscribing to and unsubscribing from presence channels it needs information about the users. It gets this information from your application when the subscription request to the channel is made (<code>pusher.subscribe('presence-channel')</code>). Since we can't really trust the web browser/client (it's so easy to hack JavaScript running in a web browser) the Pusher library requests this information from your web server by making an AJAX call. By default this call goes to <code>/pusher/auth</code> and passes two parameters; <code>channel_name</code>, which is the name of the channel being subscribed to, and <code>socket_id</code>, which is a unique identifier for the current user's connection to Pusher.</p>
<pre><code>/pusher/auth/?channel_name=presence-pusher-tshirt&amp;socket_id=&lt;unique_socket_id&gt;
</code></pre>
<p>When our application responds to this request we must provide an authentication signature to confirm that the user can subscribe to the channel and, importantly for our "Who's shopping?" widget, information about the current user. The way we'll handle this within our ASP.NET MVC application is by creating a <code>PusherController</code> with an <code>Auth(string socket_id, string channel_name)</code> action, and by using the authentication functionality within the <a href="https://github.com/leggetter/pusher-rest-dotnet">PusherRESTDotNet library</a>. This library is also available as a <a href="http://nuget.org/List/Packages/PusherRESTDotNet">NuGet package</a>.</p>
<p><em>Note: If you got the NuGet package as part of the last tutorial you'll need to update it since the authentication functionality has just been added. You should also check that the .NET 3.5 runtime version of Newtonsoft.Json is added.</em></p>
<h3>Handling the authentication request</h3>
<p>As mentioned above, the Pusher JavaScript library will make a request to <code>/pusher/auth</code> when making the authentication request. Our new <code>PusherController</code> with <code>Auth</code> action does the following:</p>
<ol>
<li>Fetches our Pusher credentials from the Web.config file.</li>
<li>Creates a new <code>PusherProvider</code> using the Pusher credentials</li>
<li>Creates a unique <code>user_id</code> for the presence channel</li>
<li>Creates an authentication string and returns that string as the <code>Content</code> of a <code>ContentResult' with the</code>ContentType<code>set to</code>application/json` in response to the AJAX request.</li>
</ol>
<p>For the moment this code doesn't do any user authentication or provide any additional information about the current user.</p>
<pre><code>using System;
using System.Configuration;
using System.Web.Mvc;
using PusherRESTDotNet;
using PusherRESTDotNet.Authentication;

namespace RealTimeWebStore.Controllers
{
    public class PusherController : Controller
    {
        public ActionResult Auth(string channel_name, string socket_id)
        {
            var applicationId = ConfigurationManager.AppSettings["application_id"];
            var applicationKey = ConfigurationManager.AppSettings["application_key"];
            var applicationSecret = ConfigurationManager.AppSettings["application_secret"];

            var channelData = new PresenceChannelData()
            {
                user_id = Guid.NewGuid().ToString()
            };

            var provider = new PusherProvider(applicationId, applicationKey, applicationSecret);
            string authJson = provider.Authenticate(channel_name, socket_id, channelData);

            return new ContentResult { Content = authJson, ContentType = "application/json" };
        }
    }
}
</code></pre>
<p>If we use one of the many web browser development tools available to us to inspect the authentication call within the browser we'll see the JSON response coming back.</p>
<p><img alt="Screen+shot+2011-08-04+at+17" src="http://blog.pusher.com/media/2011/08/04/09/07/01/978/Screen+shot+2011-08-04+at+17.06.17.jpg?m=resize&amp;o%5Bgeometry%5D=500x400&amp;s=0d9d3c037a95e8d6" /></p>
<p>You'll see the response contains a <code>channel_data</code> property which itself has a <code>user_id</code> with a unique <a href="http://msdn.microsoft.com/en-us/library/system.guid.aspx"><code>Guid</code></a> value and a <code>user_info</code> property with a <code>null</code> value. Pusher uses this <code>user_id</code> value to uniquely identify the user subscription to the presence channel. So it's very important to make sure that each user has a unique ID.</p>
<h3>Adding authentication</h3>
<p>We've mentioned authentication a few times but as yet we haven't authenticated the user. If the user has already logged (our app doesn't have this functionality, but most do) in we can use the existing <code>User.Identity</code> or else we can just assign a guest identity to the user. Once we have a unique ID for the user we'll also add some additional <code>user_info</code> to the <code>channelData</code>. The value of <code>user_info</code> can be anything you like from a simple string to a complex object. This gives you the ability to push as much additional information through Pusher and to the web page as you like. In our case we'll just send through a timestamp which identifies how long the user has been on the site.</p>
<pre><code>public ActionResult Auth(string channel_name, string socket_id)
{
    var channelData = new PresenceChannelData();
    if (User.Identity.IsAuthenticated)
    {
        channelData.user_id = User.Identity.Name;
    }
    else
    {
        channelData.user_id = GetUniqueUserId();
    }
    channelData.user_info = GetUserInfo();

    var provider = new PusherProvider(applicationId, applicationKey, applicationSecret);
    string authJson = provider.Authenticate(channel_name, socket_id, channelData);

    return new ContentResult { Content = authJson, ContentType = "application/json" };
}
</code></pre>
<p><em>Note: In our case we don't really need to authorise a user but in other situations where the user needs to be logged in we can return a 401  <a href="http://msdn.microsoft.com/en-us/library/system.web.mvc.httpstatuscoderesult(v=vs.98).aspx?ppud=4"><code>HttpStatusCodeResult</code></a>.</em></p>
<h2>Who's Shopping?</h2>
<p>Now that we've got a <code>PusherController</code> that gives Pusher information about the user, we can start showing information about the user on the product page. You can get information about the users subscribed to presence channels by binding to the <a href="http://pusher.com/docs/client_api_guide/client_presence_events#pusher-subscription-succeeded"><code>pusher:subscription_succeeded</code></a> event on the presence channel object. The callback method for this event receives a <a href="http://pusher.com/docs/client_api_guide/client_presence_events#members-parameter"><code>members</code></a> parameter which contains all the information about users subscribed to the channel.</p>
<p>First we'll create some HTML within our web page where we are going to show "Who's shopping?". Then we'll add the users to the HTML when pusher notifies us of them.</p>
<p><strong>HTML</strong></p>
<pre><code>&lt;div class="whos-shopping"&gt;
    &lt;h3&gt;Who's shopping?&lt;/h3&gt;
    &lt;ul&gt;&lt;/ul&gt;
&lt;/div&gt;
</code></pre>
<p><strong>JavaScript</strong></p>
<pre><code>var pusher = new Pusher("006c79b1fe1700c6c10d");
var channel = pusher.subscribe("presence-" + productId);
channel.bind("pusher:subscription_succeeded", function(members) {

    members.each(function(member) {
        addMember(member);
    });

});

function addMember(member) {
    var enteredSite = new Date(member.info.timestamp);
    var now = new Date();
    var timeOnSite = (now - enteredSite);
    var li = $("&lt;li data-user-id='" + member.id + "'&gt;" +
                    member.id + " here for " +
                    toReadableTime(timeOnSite) + 
               "&lt;/li&gt;");
    $(".whos-shopping ul").append(li);
};
</code></pre>
<p><em>Note: The <code>members</code> object comes with a handy <code>each</code> method to make iterating the members collection really easy.</em></p>
<p>Of course new users can navigate to the page and existing users can leave it so the Pusher JavaScript library also exposes <a href="http://pusher.com/docs/client_api_guide/client_presence_events#pusher-member-added"><code>pusher:member_added</code></a> and <a href="http://pusher.com/docs/client_api_guide/client_presence_events#pusher-member-removed"><code>pusher:member_removed</code></a> events on the presence channel object. When these events fire we should add or remove the user as required.</p>
<pre><code>channel.bind("pusher:member_added", function(member) {
    addMember(member);
});
channel.bind("pusher:member_removed", function(member) {
    removeMember(member);
});

function addMember(member) {
    /* as before */
};

function removeMember(member) { 
    $(".whos-shopping ul li[data-user-id='" + member.id + "']").remove();
};
</code></pre>
<p>With this in place we now have a fully functioning "Who's shopping?" widget that shows the current user who else is viewing the same product as they are.</p>
<p><img alt="Screen+shot+2011-08-03+at+21" src="http://blog.pusher.com/media/2011/08/03/13/19/53/544/Screen+shot+2011-08-03+at+21.10.42.jpg?m=resize&amp;o%5Bgeometry%5D=500x400&amp;s=ee8762b09260ca71" /></p>
<p>As mentioned in the opening paragraph, the theory here is that if shoppers can see that others users are viewing the same product it might give them that little push they need to take the plunge and make that purchase "while stocks last".</p>
<p>There are a few refinements and enhancements that could be made to this widget such as filtering out the current user from the "Who's shopping?" list or possibly showing them which one they are. You could also use the notification system from last time to notify the shopper when another shopper joins or leaves the product page. And, of course, you could add some user chat functionality to get the users discussing the product and really engaging. You could also have a staff member user who could answer any questions that the shoppers may have.</p>
<p>Just as last time all the code from this post is available in the <a href="https://github.com/leggetter/realtime-webstore">real-time web store github repo</a>. You can also see the <a href="http://realtimewebstore.apphb.com/">Real-Time Web Store application up and running</a> on <a href="https://appharbor.com/">AppHarbor</a>. I've tried to link to relevant parts of the <a href="http://pusher.com/docs">Pusher documentation</a> throughout the post but if there anything that isn't clear, if there's anything that I've not provided enough detail on and it all just seems too <em>'magical'</em>, then please leave a comment or send an email to me (<a href="mailto:phil@pusher.com?subject=ASP.NET%20real-time%20web%20store">phil@pusher.com</a>).</p>
<p>Here are some links to the key things covered in this post:</p>
<ul>
<li><a href="http://pusher.com/docs/presence">Presence channels</a></li>
<li><a href="http://pusher.com/docs/client_api_guide/client_presence_events">Presence channel events</a></li>
<li><a href="http://pusher.com/docs/authenticating_users">Authenticating Users</a></li>
<li><a href="http://pusher.com/docs/rest_libraries#cs">Pusher REST .NET Library</a> | <a href="http://nuget.org/List/Packages/PusherRESTDotNet">NuGet package</a></li>
<li><a href="https://github.com/leggetter/realtime-webstore">ASP.NET real-time web store in github</a></li>
<li><a href="http://realtimewebstore.apphb.com/">Real-Time Web Store application up and running</a></li>
<li><a href="http://www.asp.net/mvc/mvc3">ASP.NET MVC 3</a></li>
</ul>
<h2>Addendum: What about WebForms?</h2>
<p>The post above shows how to user the Pusher REST .NET library within an ASP.NET MVC application but it can just as easily be used within an ASP.NET WebForms app. The way I achieved this was by adding a new Generic HTTP Handler to our web app which will handle the authentication AJAX call.</p>
<p><img alt="Screen+shot+2011-08-02+at+16" src="http://blog.pusher.com/media/2011/08/03/13/22/53/682/Screen+shot+2011-08-02+at+16.07.19.jpg?m=resize&amp;o%5Bgeometry%5D=500x400&amp;s=8b9774ad1cdd29ca" /></p>
<p>In the code below the <code>ProcessRequest</code> method does the following things:</p>
<ol>
<li>Fetches our Pusher credentials from the Web.config file.</li>
<li>Gets the values of the <code>channel_name</code> and <code>socket_id</code> parameters from the <code>context.Request</code></li>
<li>Creates a new <code>PusherProvider</code> using the Pusher credentials</li>
<li>Creates a unique <code>user_id</code> for the presence channel</li>
<li>Creates an authentication string and returns that string as the response body of the AJAX request.</li>
</ol>
<p>For the moment this code doesn't do any user authentication or provide any additional information about the current user.</p>
<pre><code>using System.Configuration;
using System.Web;
using PusherRESTDotNet;
using PusherRESTDotNet.Authentication;
using System;

namespace RealTimeWebStore
{
    public class AuthHandler : IHttpHandler
    {
        public void ProcessRequest(HttpContext context)
        {
            var applicationId = ConfigurationManager.AppSettings["pusher-application-id"];
            var applicationKey = ConfigurationManager.AppSettings["pusher-application-key"];
            var applicationSecret = ConfigurationManager.AppSettings["pusher-application-secret"];

            var socketID = context.Request["socket_id"].ToString();
            var channelName = context.Request["channel_name"].ToString();
            var channelData = new PresenceChannelData()
            {
                user_id = Guid.NewGuid().ToString()
            };

            var provider = new PusherProvider(applicationId, applicationKey, applicationSecret);
            string authJson = provider.Authenticate(channelName, socketId,  channelData);

            context.Response.Write(authJson);
        }

        public bool IsReusable
        {
            get
            {
                return false;
            }
        }
    }
}
</code></pre>
<p>Finally we need to configure our handler in the application <code>Web.config</code> file. We want the <code>ProcessRequest</code> method of our handler to be invoked for any call to <code>/pusher/auth</code>. To do this we just add a handler to the <code>httpHandlers</code> element and specify our handler, <code>RealTimeWebStore.AuthHandler</code> as the handler:</p>
<pre><code>&lt;system.web&gt;
  &lt;!-- other config --&gt;
  &lt;httpHandlers&gt;
    &lt;add verb="*"
         path="/pusher/auth/"
         type="RealTimeWebStore.AuthHandler" /&gt;
  &lt;/httpHandlers&gt;
&lt;/system.web&gt;
</code></pre>
<p><script><br />
var div = $("
<div/>")<br />
.css({<br />
"text-align":"center",<br />
"margin":"auto",<br />
"margin-bottom":"10px"<br />
});<br />
$(".entrybody img")<br />
.css({<br />
"-moz-border-radius": "4px",<br />
"-webkit-border-radius": "4px",<br />
"-o-border-radius": "4px",<br />
"-ms-border-radius": "4px",<br />
"-khtml-border-radius": "4px",<br />
"border-radius": "4px",<br />
"border": "1px solid #DEDEDE",<br />
"padding": "4px"})<br />
.wrap(div);<br />
</script></p>

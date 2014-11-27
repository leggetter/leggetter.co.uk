---
layout: post
status: publish
published: true
title: The easiest way to add real-time functionality to an ASP.NET e-commerce application
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "While adding realtime functionality to ASP.NET applications has often seemed difficult due to the connection limitations of the IIS platform, it can actually be achieved fairly easily by offloading this component to third party services like Pusher. In..."
wordpress_id: 21707
wordpress_url: "http://blog.pusherapp.com/2011/6/25/the-easiest-way-to-add-real-time-functionality-to-an-asp-net-e-commerce-application"
date: "2011-07-05 01:00:00 +0100"
date_gmt: "2011-07-05 00:00:00 +0100"
categories:
  - Technology
tags:
  - real-time web
  - real-time
  - pusher
permalink: "http://blog.pusherapp.com/2011/6/25/the-easiest-way-to-add-real-time-functionality-to-an-asp-net-e-commerce-application"
---

<p>While adding realtime functionality to ASP.NET applications has often seemed difficult due to the connection limitations of the IIS platform, it can actually be achieved fairly easily by offloading this component to third party services like Pusher. In this series of posts, I'll get you started with this exciting technology through a number of hands-on tutorials. In the first one we'll build a simple e-commerce application that displays realtime stock levels to the customers.</p>
<p>One of the problems with existing e-commerce solutions can be trying to buy something which, whilst you've been online, has sold out. This can be a big problem for high demand products like gig tickets or sporting events such as the Olympics. A really good way of avoiding this is to show the customers just how fast tickets are selling. The added benefit of this, from a business point of view, is that it can give users that little push they needed to make that purchase. In this tutorial I'll show how to:</p>
<ul>
<li>establish a connection to Pusher in the view</li>
<li>subscribe to a product channel</li>
<li>bind events from this channel to our stock indicator in the view and update the stock level</li>
<li>send stock level update from our server when someone buys something</li>
</ul>
<h2>Getting started</h2>
<p>To demonstrate adding real-time functionality to an ASP.NET website I'm going to start with a simple one page e-commerce site which has one product: our cool Pusher t-shirt (Sorry, they're not really for sale. You've got to earn them!). On the product page there is a counter which tells the customer how many t-shirts we have in stock.</p>
<div style="margin:auto; text-align:center;margin-bottom:20px;"><img alt="One-browser" src="http://blog.pusher.com/media/2011/06/27/05/04/29/40/one-browser.jpg?m=resize&amp;o%5Bgeometry%5D=600x300&amp;s=413d474f960a2e7c" /></div>
<p>To start off with our e-commerce website is a simple ASP.NET MVC3 app with:</p>
<ul>
<li>A <code>StoreController</code> with two actions. One to display the default view and one to handle the "Buy" button being clicked and the stock level being decreased.</li>
<li>A single <a href="http://weblogs.asp.net/scottgu/archive/2010/07/02/introducing-razor.aspx">Razor</a> view displaying the single product</li>
<li>Two models; one for the product called <code>ProductModel</code> and one for images called <code>ProductImage</code></li>
<li>A <code>ProductRepository</code> where we store our products</li>
</ul>
<h2>Connect to Pusher</h2>
<p>As I've already said, adding real-time functionality is really simple - that's the point! Firstly we have to include the Pusher JavaScript client library. We'll add this to the view for the moment although we might want to make the include part of the site layout in the future.</p>
<p><em>Note: If your e-commerce page was being served up over HTTPS you would include our library over HTTPS too to avoid any browser warnings.</em></p>
<p>Since we are using ASP.NET MVC we've already got jQuery included from the <code>_Layout.cs.html</code> so we can wait until the page has loaded and connect to Pusher. The script include and the code that connects to Pusher looks as follows:</p>
<pre><code>&lt;script src="http://js.pusherapp.com/1.8/pusher.min.js"&gt;&lt;/script&gt;
&lt;script&gt;
    $(function() {
        var pusher = new Pusher("006c79b1fe1700c6c10d");
    });
&lt;/script&gt;
</code></pre>
<h2>Subscribe to the product channel</h2>
<p>Now that we've connected to Pusher we can push events from our StoreController to all connected browsers if any information changes about the product. The main piece of information that customers might want to know about is if the stock level changes. These t-shirts could sell out fast!</p>
<p>We need to choose a channel name to subscribe and publish to and the obvious choice is to use the unique product id for this. We'll also prefix it with <code>product-</code> just so it's really clear that the channels is for a product. We subscribe to this channel on the client as follows getting the product id from the Model that has been bound to the page:</p>
<pre><code>var channel = pusher.subscribe("product-@Model.ProductId");
</code></pre>
<h2>Bind to stock update events</h2>
<p>Once we've got a channel object we can bind to events on it. We want to be informed when the stock level changes so let's bind to an event called <code>stockUpdated</code>. We'll also expect a JSON object to be passed which represents the <code>ProductModel</code> and will have the same properties on it. That way we can simply update the stock level in the page to match the value on the server by accessing the <code>ProductModel.StockLevel</code> value. We can also update the stock status:</p>
<pre><code>channel.bind("stockUpdated", function(product) {
    $(".product .stock .level").html(product.StockLevel);
    $(".product .stock .status").html(product.StockStatus);
});
</code></pre>
<h2>Trigger stock update events</h2>
<p>As you can see, this is really easy to do. It's just as easy to trigger the event on the server too. To do this we're going to be using the <a href="https://github.com/grahamscott/pusherrestdotnet">C# REST API library</a> within our <code>StoreController</code>. You can get the PusherRESTDotNet library from <a href="https://github.com/grahamscott/pusherrestdotnet">github</a> or <a href="http://nuget.org/Package/Edit/PusherRESTDotNet/1.0">via NugGet</a>.</p>
<div style="margin:auto;text-align:center;margin-bottom:20px;"><a href="http://nuget.org/Package/Edit/PusherRESTDotNet/1.0"><img alt="Pusher-rest-library-nuget" src="http://blog.pusher.com/media/2011/06/25/14/08/10/392/pusher-rest-library-nuget.jpg?m=resize&amp;o%5Bgeometry%5D=600x300&amp;s=837c6fbf2f053537" /></a></div>
<p>Once we've added our PusherRESTDotNet reference we can add a few lines of code to our <code>StoreController</code> to instantly push any changes in stock level to all connected web browsers viewing our t-shirt page.</p>
<p>The first thing to do is to create a <code>PusherProvider</code> and pass in our Pusher details. In this example we are storing these details in the ASP.NET MVC3 <code>Web.config</code>.</p>
<h3>Web.config</h3>
<pre><code>&lt;configuration&gt;
  &lt;appSettings&gt;
    &lt;add key="application_id" value="APP_ID" /&gt;
    &lt;add key="application_key" value="APP_KEY" /&gt;
    &lt;add key="application_secret" value="APP_SECRET" /&gt;

    &lt;!-- more settings --&gt;
  &lt;/appSettings&gt;

  &lt;!-- more config --&gt;
&lt;/configuration&gt;
</code></pre>
<h3>StoreController.cs</h3>
<pre><code>public class StoreController : Controller
{
  private IPusherProvider _provider;

  public StoreController()
  {
      string applicationKey = ConfigurationManager.AppSettings["application_key"];
      string applicaitonSecret = ConfigurationManager.AppSettings["application_secret"];
      string applicationId = ConfigurationManager.AppSettings["application_id"];
      _provider = new PusherProvider(applicationId, applicationKey, applicaitonSecret);
  }

  // more code here...
}
</code></pre>
<p>Once we've created our instance of the <code>PusherProvider</code> we can create a <code>PusherObjectRequest</code> to push the <code>ProductModel</code>, with an updated <code>StockLevel</code> following the purchase, to the clients. The serialisation of the model object is handled for us by the PusherRESTDotNet library. The full <code>StoreController.Index</code> HTTP POST handling action looks like this:</p>
<pre><code>[HttpPost]
public ActionResult Index()
{
  bool bought = MvcApplication.ProductRepository.Buy(MvcApplication.BLUE_TSHIRT_ID);
  var model = MvcApplication.ProductRepository.GetProductById(MvcApplication.BLUE_TSHIRT_ID);

  if (bought)
  {
      ViewBag.Info = model.Title + " successfully bought";

      ObjectPusherRequest request = new ObjectPusherRequest("product-" + model.ProductId, "stockUpdated", model);
      _provider.Trigger(request);
  }
  else
  {
      ViewBag.Error = "There was a problem buying " + model.Title;
  }

  return View("Index", model);
}
</code></pre>
<p>Now, if you run your application and open two or more windows, as soon as a user in one window clicks the "Buy" button you'll see that the stock level value instantly updates in all other windows.</p>
<div style="margin:auto; text-align:center;margin-bottom:20px;"><iframe src="http://www.screenr.com/embed/kfNs" width="600" height="366" frameborder="0"></iframe><br />
<small><em>Note: the video looks a little jittery because it was recorded on a VM running on Mac</em></small></div>
<h2>Next time - displaying real-time "Who's shopping" info with Pusher presence</h2>
<p>We now have the stock level indicator changing in real-time. This tells the users that these t-shirts are selling out fast and gives them an added incentive to make that impulse buy. This is a simple yet effective change but there's more we can do. What if we also show the user how many other users are viewing that product at the same time so that they know there is competition for the last few t-shirts? We can do that easily using Pusher's <a href="http://pusher.com/docs/presence">presence</a> functionality and I'll cover that in my next <strong>Real-Time ASP.NET</strong> blog post which will also go into how to add Pusher <a href="http://pusher.com/docs/authenticating_users">user authentication</a> to your ASP.NET web application.</p>
<p>In the meantime you can download the source of the <a href="https://github.com/leggetter/realtime-webstore">Real-Time Web Store from github</a>. The solution contains a project with the basic web store without any real-time Pusher functionality as well as a solution project. Here are some additional things you you might also want to try out:</p>
<ul>
<li>Changing the form submission when the user clicks "Buy" so that the <code>POST</code> to the <code>Buy</code> action it is made using a <a href="http://api.jquery.com/jQuery.ajax/">jQuery ajax call</a></li>
<li>Making the change in stock levels more visually interesting. Try adding an <a href="http://jqueryui.com/docs/effect/">effect</a> to the number change or providing a <a href="http://webtoolkit4.me/2009/08/13/jquery-growl-likenotification-systems/">growl-like notification</a></li>
<li>Changing the CSS - it's not my strong point :-)</li>
</ul>

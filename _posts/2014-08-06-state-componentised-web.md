---
layout: post
title: "[Updated] The State of the Componentised Web"
permalink: /2014/08/06/state-componentised-web.html
excerpt: "<p>The idea of building applications out of a number of independent components isn’t anything new. But with Web Components on the horizon I thought it would be a good time to look at component-based application development, how we benefit from taking this approach, how we can build our applications in this way using existing technologies and how we’re likely to be building our front-end web apps in the future.</p>"
thumb: /images/web-components/web-component-status.png
---

<p><strong>For completeness the article is now available in full below and will be updated over time.</strong></p>
  <p><a href="http://www.futureinsights.com/home/the-state-of-the-componentised-web.html">The State of the Componentised Web blog post</a> is now available on the Future Insights blog.</p>
  <p>If you’re interested in attending <a href="https://futureofwebapps.com/london-2014/?utm_source=Future%20Insights&amp;utm_medium=Blog&amp;utm_campaign=08062014%20Leggetter%20Guest%20Blog">FOWA London</a> you can use the coupon code “BRJSFOWA15″ when <a href="https://futureofwebapps.com/london-2014/?utm_source=Future%20Insights&amp;utm_medium=Blog&amp;utm_campaign=08062014%20Leggetter%20Guest%20Blog">signing up</a>.</p>
  <hr>
  <h2>Introduction</h2>
  <p>The idea of building applications out of a number of independent components isn’t anything new. But with Web Components on the horizon I thought it would be a good time to look at component-based application development, how we benefit from taking this approach, how we can build our applications in this way using existing technologies and how we’re likely to be building our front-end web apps in the future.</p>
  <h2>What are Components?</h2>
  <p>Software development is a field that suffers from a considerable amount of <a href="http://en.wikipedia.org/wiki/Semantic_overload">semantic overload</a> (terms that can have more than one meaning). “Component” is clearly very generic so it makes sense to qualify what we mean when we talk about them in the context of front-end web apps.</p>
  <p>A component within a front-end web app is a piece of software that has generally been designed and built to work within a larger application. A component can be represented within an application in a number of ways. It may have a UI (User Interface) or may be purely logical and could be throught of as more of a “service”.</p>
  <p>UI components are easier to comprehend because there is a visual representation. Buttons, input boxes and textareas are nice simple examples. The hamburger menu button (whether you like it <a href="http://techcrunch.com/2014/05/24/before-the-hamburger-button-kills-you/">or not</a>), tabs, calendars, a tab menu or even a rich text WYSIWIG editor can be considered to be more advanced examples.</p>
  <p>Components that offer service-type functionality can be more difficult to get your head around. Examples may include cross-browser AJAX functionality, logging or one that offers some form of data persistence.</p>
  <p>An important part of compontent-based development is that components can be composed out of other components. The rich text editor is a great example of this since it will be composed out of buttons, drop downs, some sort of rich view and so on. Another good example is the HTML5 video element which again contains buttons and also an element which renders content from a video data stream.</p>
  <h2>Why Build Components?</h2>
  <p>Now that we have a good idea of what exactly we mean by component we should take a look at the benefits of building front-end apps in a component-based way.</p>
  <h3>Modular</h3>
  <p>You may come across helpful phrases like <em>Components are inherently modular</em>. Well, thanks for that!</p>
  <p>There’s that overloading of terms again. You could argue that the term “Component” better fits the idea of the UI and “Module” may be suited to logical functionality, such as that provided by a service. For me, modules and components are near-synonyms; the offer a way of grouping, focusing and encapsulating everything that is related to a unit of functionality.</p>
  <h3>High Cohesion</h3>
  <p><em>Another ticked checkbox in the software engineering buzzword (term) bingo!</em> We are grouping and encapsulating everything related to a piece of functionality. In the case of components this can be the functional logic and assets; JavaScript, HTML, CSS, Images etc. This is precisely what we mean be cohesion.</p>
  <p>Doing this makes maintaining a component much easier and in doing so increases reliablity. It also keeps the component focused, increasing the likelihood that it will be reusable.</p>
  <h3>Reusable</h3>
  <p>When you see example components – particularly Web Component examples – the focus will be very much on reuse. Having a focused module with a clean and easy to understand API naturally encourages reuse. By building reusable components we adhere to the <a href="http://en.wikipedia.org/wiki/Don't_repeat_yourself">DRY (Don’t Repeat Yourself)</a> principle and all the benefits it provides.</p>
  <p><strong>A word of warning:</strong> Don’t focus too much on trying to build reusable components. Focus on building the required piece of functionality for your application, which may be very specific. Then, if the need arises, or it becomes very clear that the component is reusable, put in the extra effort to make the component reusable. As developers love to create reusable functionality (libraries, components, modules, plugins etc.). Doing so prematurely can result in a world of pain. So, take all the other benefits of component-based development and accept that not everything you write can be 100% reusable.</p>
  <h3>Interchangable</h3>
  <p>A nice and focused component API presents the opportunity to be able to easily change the underlying implementation. Or, if the components within the application are loosely coupled you can actually completely swap one component for another as long as they offer the same <a href="http://en.wikipedia.org/wiki/Design_by_contract">API/interface/contract</a>.</p>
  <p>For example, if you were to use a service component that offered <a href="https://www.leggetter.co.uk/real-time-web-technologies-guide">realtime functionality</a> via GoInstant, the news this week that they’re <a href="https://goinstant.com/blog/time-to-say-farewell">closing down</a> would probably be a bit of shock. However, you could quite feasibly create and use a <code>FirebaseComponent</code> or <code>PubNubComponent</code> as long as they offer the same data synchronisation-focused API.</p>
  <h3>Composable</h3>
  <p>As previously discussed, a component-based architecture makes it easy for one component to be composed of a number of other components. This allows the component to stay focused and benefit from reusing functionality already build and exposed in other components.</p>
  <p>More complex functionality can be built in this way; from richer application features to full applications. It’s one of the main benefits of this approach.</p>
  <p>Whether absolutely everything should be a component is really up to you. There’s no reason why your application can’t be a <code>my-app</code> component which is then composed of <code>my-awesome-feature</code> and <code>my-fabulous-features</code>. And those components are then in turn composed of other components. If you see benefits from this approach then by all means stick with it. However, be careful not to over complicate things in the same way that you shouldn’t focus too hard on making a component reusable. Focus on delivering application functionality.</p>
  <h2>Building Components Now</h2>
  <p>At <a href="http://www.caplin.com">Caplin Systems</a> we use a number of practices and principles when building our component-based applications. These are supported by the <a href="http://bladerunnerjs.org">BladeRunnerJS (BRJS)</a> open source toolkit. It’s called “BladeRunnerJS” because we encapsulate application features within something we call <a href="http://bladerunnerjs.org/docs/concepts/blades">Blades</a>. Blades are application features that can be reused within the application, but aren’t reusable across applications. When a feature becomes truly generic we shift the definition into a library to be used across applications. Application-specific components (blades) and generic components within our apps can be defined using any library and framework we feel suits the feature we’re building best.</p>
  <p>So, what libraries and frameworks exist that can help us build components?</p>
  <p>Just take a look at the ever-popular <a href="http://todomvc.com/">TodoMVC site</a> and you’ll see there are a vast number of front-end libraries and frameworks to choose from when making a decision on what technology to use when building your app. You could argue that any of these solutions can be used to build a component-based application. However, some of them come with in-built <code>Component</code> functionality. The most popular of these include AngularJS, Ember and React.</p>
  <h3>How do Components Communicate with Each Other?</h3>
  <p>Before we dive into the examples it’s worth briefly mentioning inter-component communication. If these components are “independent” and “modular” how do they communicate with each other?</p>
  <p>The obvious solution is to make components directly reference each other and interact via their API. The problem with this is that you introduce a direct dependency between components. In the short-term this can be fine. But over time your application may start to creak as you try to make changes; changing one component has an unexpected knock-on effect with another component. The decision to remove a component that isn’t delivering the product value you expected can result in your app breaking because one or more other components relied on it.</p>
  <p>The solution here is <a href="http://en.wikipedia.org/wiki/Loose_coupling">loose coupling</a> where components have little or no knowledge of each other. They don’t directly create other components and when they need to communicate they do so through interfaces/contracts or via <strong>services</strong>. We’ve thought a lot about this when building BRJS apps and we use a <code>ServiceRegistry</code> to access <a href="http://bladerunnerjs.org/docs/concepts/services/">services</a> that are used for inter-component communication or to interact with resources such as Web APIs. Solutions like Angular and Ember use services and <a href="http://en.wikipedia.org/wiki/Dependency_injection">Dependency Injection</a> for this.</p>
  <h3>my-avatar Example Component</h3>
  <p>To demonstrate the very basics of how each of theses libraries and frameworks allow us to build components we’ll build a simple example with a UI that fetches and displays a user’s avatar. The component, where possible, will have the tag <code>my-avatar</code> and will fetch an avatar based on two attributes:</p>
  <ul>
  <li><code>service</code> which will allow a service to be set e.g. <code>twitter</code> or <code>facebook</code></li>
  <li><code>username</code> which identifies the user that we wish to fetch the avatar for</li>
  </ul>
  <h3>AngularJS</h3>
  <p><a href="http://angularjs.org">AngularJS</a> is probably the most popular front-end solution for building apps right now. The creators – Google – took the approach of thinking about how HTML would look if it were re-invented to address the needs of the web as they are now.</p>
  <p>Components can be defined in Angular using <a href="https://docs.angularjs.org/guide/directive">custom directives</a>. Directives then allow you to declare custom components within your HTML markup.</p>
  <p><iframe src="http://jsbin.com/lacog/2/embed?html,output" class="" id="" style="border: 1px solid rgb(170, 170, 170); width: 100%; min-height: 300px; height: 30px;"></iframe><script src="http://static.jsbin.com/js/embed.js"></script></p>
  <p>This example demonstrate how simple it can be to use Angular directives. The <code>scope</code> values define the attributes that are used from the <code>my-avatar</code> element and those attributes are then used when building the underlying image tag that is rendered and shows the user’s avatar.</p>
  <p>As you can see, the HTML looks as follows:</p>

```html
<my-avatar service="twitter" username="leggetter" />
```

  <h3>Ember</h3>
  <p>There’s an ongoing debate about frameworks v libraries, where in some circles frameworks are seen as forcing you to work in particular ways and are therefore evil. Well, Angular is clearly a framework and Yehuda Katz and Tom Dale – the developers behind Ember – are also <a href="https://www.youtube.com/watch?v=jScLjUlLTLI">happy to call Ember a framework</a>.</p>
  <p><a href="http://emberjs.com">Ember</a> has in-built support for what it aptly calls <a href="http://emberjs.com/guides/components/">Components</a>. The idea behind Ember Components is to align as much as possible with Web Components so that they can be migrated to native Web Components when browser support permits.</p>
  <p><iframe src="http://jsbin.com/nawuwi/4/embed?html,output" class="" id="" style="border: 1px solid rgb(170, 170, 170); width: 100%; min-height: 300px; height: 30px;"></iframe><script src="http://static.jsbin.com/js/embed.js"></script></p>
  <p>The example below uses <a href="http://handlebarsjs.com/">handlebars</a> for templating so the element definition doesn’t follow the exact same syntax:</p>

```html
<script type="text/x-handlebars">
{% raw %}  {{my-avatar service="twitter" username="leggetter"}}{% endraw %}  
</script>
```

  <h3>React</h3>
  <p><a href="http://facebook.github.io/react/">React</a> is the new kid on the block but has already gained a significant following. It’s developed by Facebook and is used for the full Instagram UI and some of the Facebook UI.</p>
  <p>The recommended approach to building components using React is to define them using something called <a href="http://facebook.github.io/react/docs/jsx-in-depth.html">JSX</a>. This is a “JavaScript XML syntax transform recommended for use with React”. Don’t let this put you off. As they point out in the docs the idea is to allow HTML markup within a JavaScript structure to help you visualise.</p>
  <p>As far as I can tell you can’t add markup directly to HTML and you have to create your component using JSX too. But, once you’ve defined a component you can then create other components that use it (composition).</p>
  <p><iframe src="http://jsbin.com/qigoz/5/embed?html,output" class="" id="" style="border: 1px solid rgb(170, 170, 170); width: 100%; min-height: 300px; height: 30px;"></iframe><script src="http://static.jsbin.com/js/embed.js"></script></p>
  <p>So, the syntax for declaring using the component requires an HTML element and a call to <code>React.RenderComponent</code> e.g.</p>

```html
<div id="avatar"></div>
<script>
  React.renderComponent(
    <MyAvatar service="twitter" username="leggetter" />,
    document.getElementById('avatar')
  );
</script>
```

<h2>The Future: Web Components &amp; Beyond</h2>
<p>Web Components are the future! As the name suggests they promise to deliver native browser support for building components that can encapsulate functionality.</p>
<p>I’ll provide a brief overview of Web Components below and demonstrate how we can start using them now. For a deeper dive please see the <em>Resources</em> section at the end of this post.</p>
<p>The functionality they provide includes:</p>
<h4>Custom Elements</h4>
<p>In the examples above that used Angular, Ember and React we focused on building the <code>my-avatar</code> component. Where possible this was represented as a custom element that we added to the page or template markup. Web Components includes native support for this via <a href="http://www.html5rocks.com/en/tutorials/webcomponents/customelements/">Custom Elements</a> – an absolutely fundamental part of the Web Component specification.</p>
<p>Part of defining new elements includes access to element lifecycle events such as when it is created (<code>createdCallback</code>), when it’s attached from the DOM (<code>attachedCallback</code>), when it detaches from the DOM (<code>detachedCallback</code>) and when element attributes change (<code>attributeChangedCallback(attrName, oldVal, newVal)</code>).</p>
<p>An important part of Custom Elements is the ability to extend the functionality offered by an existing element and in doing so inherit its functionality. In our examples below we’ll extend the <code>img</code> elemnet.</p>
<p>Ultimately what Custom Elements are doing, and what we tend to do when we write modular code, is abstracting away complexity to enable the users of the component to focus on getting value from using an element and build richer functionality.</p>
<h4>Shadow DOM</h4>
<p>Remember IFRAMES? Many of us still use them because they ensure JavaScript and CSS from a widget or component don’t leak into a page. The <a href="http://www.html5rocks.com/en/tutorials/webcomponents/shadowdom/">Shadow DOM</a> provides this scope protection without the baggage that comes with IFRAMES. The official line on this is:</p>
<blockquote><p>
Shadow DOM is designed to provide encapsulation by hiding DOM subtrees under shadow roots. It provides a method of establishing and maintaining functional boundaries between DOM trees and how these trees interact with each other within a document, thus enabling better functional encapsulation within the DOM.
</p></blockquote>
<h4>HTML Imports</h4>
<p>We’ve been able to import JavaScript and CSS for a long time. <a href="http://www.html5rocks.com/en/tutorials/webcomponents/imports/">HTML Imports</a> give us the ability to include and reuse HTML documents in other HTML documents. The simplicity also means it’s easy for us to build components composed from other components.</p>
<p>Finally, the format is ideally suited for reusability and distribution through your favourited package management solution (e.g. <a href="http://bower.io/">bower</a>, <a href="https://www.npmjs.org/">npm</a> or <a href="https://github.com/component/guide">Component</a>).</p>
<h4>Templates</h4>
<p>Many of us already use solutions like handlebars (that we used in the Ember example, above), mustache or underscore.js templating. Web Components adds native support for <a href="http://www.html5rocks.com/en/tutorials/webcomponents/template/">Templates</a> via a <code>template</code> element.</p>
<p>Native templates allow you to declare fragments of markup which are parsed as HTML but classed as being “hidden DOM”. They go unused at page load, but can be instantiated later on at runtime. They are queryable and won’t load any related assets until they are inserted into active DOM.</p>
<h3>Platform.js</h3>
<p>But – as per usual – we’re not quite in the position to be able to use them as browser support isn’t there yet.</p>
<p><img src="/images/web-components/web-component-status.png" alt="" scale="0"><br>
<small><em>Web Component Browser support as of 27 Jun 2014</em></small></p>
<p>But – also as per usual – we can start using some of the functionality that Web Components offer through the magic of <a href="http://en.wikipedia.org/wiki/Polyfill">polyfills</a>.</p>
<p><img src="/images/web-components/web-component-polyfill.png" alt="" scale="0"><br>
<small><em>Web Component Browser support thanks to Polyfills</em></small></p>
<p>The great news here is that the two most progressive browser vendors, Google and Mozilla, are working together on a polyfill to help us build Web Components now.</p>
<p>The example below uses <code>platform.js</code> and demonstrates how the <code>my-avatar</code> element can be defined as an extension of the <code>img</code> element. The fantastic thing about this is that it therefore picks up all the functionality of the native image element, such as accessability.</p>
<p><iframe src="http://jsbin.com/pihuz/4/embed?html,output" class="" id="" style="border: 1px solid rgb(170, 170, 170); width: 100%; min-height: 300px; height: 30px;"></iframe><script src="http://static.jsbin.com/js/embed.js"></script></p>
<p>Take a look at the <a href="http://www.html5rocks.com/en/tutorials/webcomponents/customelements/">HTML5 Rocks Custom Elements tutorial</a> for much more information on create Custom Elements.</p>
<p><em>Note: If the platform.js interests you then also take a look at <a href="http://bosonic.github.io/">bosonic</a>.</em></p>
<p>The purpose of native technology support is to offer a base for us to build on top of. So Web Components don’t signal the end for libraries and frameworks.</p>
<h3>Polymer</h3>
<p><a href="http://www.polymer-project.org/">Polymer</a> is the perfect example to demonstrate building on top of native Web Component functionality. It provides an opinionated simplified mechanism for creating custom Polymer elements and provides a number of <a href="http://www.polymer-project.org/docs/elements/core-elements.html">core</a> and <a href="http://www.polymer-project.org/docs/elements/core-elements.html">UI (Paper)</a> components for you to build your applications upon.</p>
<p><img src="/images/web-components/layers-of-polymer.png" alt="" scale="0"></p>
<p>Below you can see how the simple <code>my-avatar</code> is easily achieved and we get to use our preferred markup too.</p>
<p><iframe src="http://jsbin.com/gukoku/2/embed?html,output" class="" id="" style="border: 1px solid rgb(170, 170, 170); width: 100%; min-height: 300px; height: 30px;"></iframe><script src="http://static.jsbin.com/js/embed.js"></script></p>
<p>Google are really pushing Polymer. Check out the <a href="http://www.polymer-project.org/docs/start/tutorial/intro.html">Polymer getting started guide</a> for a hands-on example.</p>
<h3>X-Tag &amp; Brick</h3>
<p>Mozilla have developed their own Custom Element polyfill called <a href="http://www.x-tags.org/">X-Tag</a>. X-Tag is a library that polyfills several features that enable Web Components in the browser and it will soon provide full Web Component support.</p>
<p>Here’s the <code>my-avatar</code> Custom Component created using X-Tag – it’s very similar to the defined specification:</p>
<p><iframe src="http://jsbin.com/wexiz/2/embed?html,output" class="" id="" style="border: 1px solid rgb(170, 170, 170); width: 100%; min-height: 300px; height: 30px;"></iframe><script src="http://static.jsbin.com/js/embed.js"></script></p>
<p>Mozilla have also created a library called <a href="http://mozbrick.github.io/">Brick</a> which includes X-Tag and provides “a collection of UI components designed for the easy and quick building of web application UIs” in a similar way to what Google are looking to offer with Polymer.</p>
<h2>Conclusion</h2>
<p>There are lots of benefits to building applications with component-based architectures and you can tell from the approach that existing frameworks have taken and from Web Components that it’s recommended when building front-end web apps.</p>
<p>This whirlwind tour of the <strong>State of the Componentised Web</strong> has likely added to the weight of choice we developers already have when it comes to frameworks and tooling. But, Web Components may be the light at the end of the tunnel!</p>
<p><strong>Web Components will provide a native and unified way of building applications</strong>. Existing frameworks will likely move to use Web Components or demonstrate how they can be used alongside them. Ember’s strategy is to make it easy to migrate to Web Components and Facebook’s React is a good example of where integration is most likely – there’s already a <a href="http://pixelscommander.com/polygon/reactive-elements/example/">ReactiveElements</a> that demonstrates this. Since Angular and Polymer are Google projects it’s also highly likely that these two projects will align.</p>
<h2>Resources</h2>
<ul>
<li><a href="https://www.youtube.com/watch?v=8OJ7ih8EE7s">Eric Bidelman – Google I/O 2014 – Polymer and Web Components change everything you know about Web development</a></li>
<li><a href="https://www.youtube.com/watch?v=ubbzND7iDH4">Ryan Seddon – Web Directions – Web Components, The Future of Web Development</a></li>
<li><a href="http://webcomponents.org/presentations/componentize-the-web-back-to-the-browser-at-lxjs/">Addy Osmani – LXJS – Componentize The Web: Back To The Browser!</a></li>
<li><a href="http://webcomponents.org/">WebComponents.org<br>
a place to discuss and evolve web component best-practices</a></li>
</ul>

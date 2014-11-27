---
layout: post
status: publish
published: true
title: How I approach problem solving in code?
author:
  display_name: Phil Leggetter
  email: "phil@leggetter.co.uk"
  url: "http://www.leggetter.co.uk"
author_email: "phil@leggetter.co.uk"
author_url: "http://www.leggetter.co.uk"
excerpt: "Recently I was posed the following question:\r\n<blockquote>Write a piece of code that prints all odd integer numbers between 1 and 99</blockquote>\r\nThis really isn't a difficult question but it still requires some thought. When I'm posed with any question I like to break things down into their constituent parts.\r\n\r\nHere's the process I went through:\r\n\r\nOkay, so I'll define two variables for a start and end value and there's going to have to be a loop.\r\n[csharp]int startValue = 1;\r\nint endValue = 99;\r\nfor(int i = startValue;\r\n     i &amp;lt;= endValue;\r\n     i++)\r\n{\r\n   // work out if &quot;i&quot; is an odd number\r\n}[/csharp]\r\nNow, for the odd number detection. And... after a few umms and errrs ... I'm going to have to mod 2 (<code>%2</code>) the current value of <code>i</code> to work out if the value is odd. More ... umms and errs. Okay, I've finally worked out that if something mod 2 is not equal to 0 it's clearly an odd number. This took me longer than it should have but never mind. Once I've detected if <code>i</code> is an odd number I'll then put the odd number into a list for use later.\r\n[csharp]\r\nint startValue = 1;\r\nint endValue = 99;\r\nIList&lt;int&gt; oddValues = new List&amp;lt;int&amp;gt;();\r\nfor(int i = startValue;\r\n     i &amp;lt;= endValue;\r\n     i++)\r\n{\r\n   if(i%2 != 0)\r\n   {\r\n      oddValues.Add(i);\r\n   }\r\n}\r\n[/csharp]\r\nThose of you that are good at these little puzzles, or just think this is way too easy, might already be screaming at me about one of the following:\r\n<ul>\r\n\t<li>Why are you using a <code>IList<int></code>, why don't you just print the value?</li>\r\n\t<li>Odd numbers are always 2 apart so why aren't you just increment <code>i</code> by 2 using <code>i+=2</code>?</li>\r\n</ul>\r\n"
wordpress_id: 382
wordpress_url: "http://www.leggetter.co.uk/?p=382"
date: "2009-10-23 18:44:57 +0100"
date_gmt: "2009-10-23 17:44:57 +0100"
categories:
  - Technology
tags:
  - .NET
  - "C#"
  - problem solving
  - Agile
  - Coding
permalink: /2009/10/23/how-i-approach-problem-solving-in-code.html
---

<p>Recently I was posed the following question:</p>
<blockquote><p>Write a piece of code that prints all odd integer numbers between 1 and 99</p></blockquote>
<p>This really isn't a difficult question but it still requires some thought. When I'm posed with any question I like to break things down into their constituent parts.</p>
<p>Here's the process I went through:</p>
<p>Okay, so I'll define two variables for a start and end value and there's going to have to be a loop.<br />
[csharp]int startValue = 1;<br />
int endValue = 99;<br />
for(int i = startValue;<br />
     i &amp;lt;= endValue;<br />
     i++)<br />
{<br />
   // work out if &quot;i&quot; is an odd number<br />
}[/csharp]<br />
Now, for the odd number detection. And... after a few umms and errrs ... I'm going to have to mod 2 (<code>%2</code>) the current value of <code>i</code> to work out if the value is odd. More ... umms and errs. Okay, I've finally worked out that if something mod 2 is not equal to 0 it's clearly an odd number. This took me longer than it should have but never mind. Once I've detected if <code>i</code> is an odd number I'll then put the odd number into a list for use later.<br />
[csharp]<br />
int startValue = 1;<br />
int endValue = 99;<br />
IList&lt;int&gt; oddValues = new List&amp;lt;int&amp;gt;();<br />
for(int i = startValue;<br />
     i &amp;lt;= endValue;<br />
     i++)<br />
{<br />
   if(i%2 != 0)<br />
   {<br />
      oddValues.Add(i);<br />
   }<br />
}<br />
[/csharp]<br />
Those of you that are good at these little puzzles, or just think this is way too easy, might already be screaming at me about one of the following:</p>
<ul>
<li>Why are you using a <code>IList<int></code>, why don't you just print the value?</li>
<li>Odd numbers are always 2 apart so why aren't you just increment <code>i</code> by 2 using <code>i+=2</code>?</li>
</ul>
<p><a id="more"></a><a id="more-382"></a><br />
I admit it,  I missed the second point and that is a bit silly of me. However, what I have starting doing is <a title="separation of concerns" href="http://en.wikipedia.org/wiki/Separation_of_concerns">separating the concerns</a> of the piece of code. The code does two things; it detects the odd number and it prints the odd numbers. Those are two very distinct things. So, my code now looks like this:<br />
[csharp]<br />
int startValue = 1;<br />
int endValue = 99;<br />
IList&lt;int&gt; oddNumbers = new List&amp;lt;int&amp;gt;();<br />
for(int i = startValue;<br />
     i &amp;lt;= endValue;<br />
     i++)<br />
{<br />
   if(i%2 != 0)<br />
   {<br />
      oddNumbers.Add(i);<br />
   }<br />
}</p>
<p>string oddNumbersList = string.Join(&quot;,&quot;, oddNumbers.ToArray());<br />
Console.WriteLine(oddNumbersList );<br />
[/csharp]<br />
I'm now going to refactor this further so I'll put the two different pieces of functionality into different methods. I'll rename the <code>i</code>, <code>startValue</code> and <code>endValue</code> variables to be something a bit more useful; say <code>numberToCheck</code>, <code>startNumber</code> and <code>endNumber</code>. I'll also create another helper for the odd number checking named <code>IsOddNumber</code>:<br />
[csharp]<br />
IList&lt;int&gt; GetOddNumbersBetween(int startNumber, int endNumber)<br />
{<br />
   IList oddValues = new List&amp;lt;int&amp;gt;();<br />
   for(int numberToCheck = startNumber;<br />
        numberToCheck &amp;lt;= endNumber;<br />
        numberToCheck++)<br />
   {<br />
      if(IsOddNumber(numberToCheck) == true)<br />
      {<br />
         oddValues.Add(numberToChecki);<br />
      }<br />
   }<br />
   return oddValues;<br />
}</p>
<p>bool IsOddNumber(int number)<br />
{<br />
   return (number % 2 == 1);<br />
}</p>
<p>void PrintOddNumbersBetween(int startNumber, int endNumber)<br />
{<br />
   IList&lt;int&gt; oddNumbers = GetOddNumbersBetween(startNumber, endNumber);<br />
   string oddNumbersList = string.Join(&quot;,&quot;, oddNumbers.ToArray());<br />
   Console.WriteLine(oddNumbersList);<br />
}<br />
[/csharp]<br />
Let's say I then notice the second point you've been screaming at me about (Odd numbers are always 2 apart so why aren't you just increment i by 2 using i+=2) that I mentioned above? In practice I should notice this sort of thing either when I give the code a complete review, or one of my peers spots it. When I see this problem I decide to update the <code>for</code> loop, as noted, and I then see that I possibly don't need the <code>if(IsOddNumber(i) == true)</code> statement. Although it would pain me to do this, since it's a lovely little method, I would need to consider deleting it. But then it strikes me, I'm no longer just solving the "odd numbers between 1 and 99 problem" so I can't just assume that the <code>startNumber</code> is going to be an odd number. I need to make sure that it's an odd number so I'll create another small utility method for that called <code>EnsureOddNumber</code> which will check if the value passed is an odd number, and if not return the next odd number (I'd like to rethink the name of this method).</p>
<p>[csharp]<br />
IList&lt;int&gt; GetOddNumbersBetween(int startNumber, int endNumber)<br />
{<br />
   startNumber = EnsureOddNumber(startNumber);</p>
<p>   IList&lt;int&gt; oddValues = new List&amp;lt;int&amp;gt;();<br />
   for(int numberToCheck = startNumber;<br />
        numberToCheck &amp;lt;= endNumber;<br />
        numberToCheck+=2)<br />
   {<br />
      oddValues.Add(numberToCheck);<br />
   }<br />
   return oddValues;<br />
}</p>
<p>int EnsureOddNumber(int number)<br />
{<br />
   if( IsOddNumber(startNumber) == false )<br />
   {<br />
      startNumber++;<br />
   }<br />
   return startNumber;<br />
}</p>
<p>bool IsOddNumber(int number)<br />
{<br />
   return (number % 2 == 1);<br />
}</p>
<p>void PrintOddNumbersBetween(int startNumber, int endNumber)<br />
{<br />
   IList&lt;int&gt; oddNumbers = GetOddNumbersBetween(startNumber, endNumber);<br />
   string oddNumbersList = string.Join(&quot;,&quot;, oddNumbers.ToArray());<br />
   Console.WriteLine(oddNumbersList);<br />
}<br />
[/csharp]</p>
<p>Now, when I look at this code I get a warm feeling because I feel that it solves the problem, it's well engineered, the concerns are separated and the code is completely <a href="http://en.wikipedia.org/wiki/Self-documenting">self documenting</a>.</p>
<p>There are a few comments that people may have here:</p>
<blockquote><p>The question asked specifically to print odd values between 1 and 99 and you've done more than was required.</p></blockquote>
<p>Although my answer does satisfy the original question have I over engineered things? The question does specifically ask us to print odd values between 1 and 99 so maybe I should have created a function that just satisfied that requirement.</p>
<p>[csharp]<br />
void PrintOddNumbersBetween1And99()<br />
{<br />
   for(int i = 1;<br />
        i &amp;lt;= 99;<br />
        i+=2)<br />
   {<br />
      Console.WriteLine(i + &quot; &quot;);<br />
   }<br />
}<br />
[/csharp]</p>
<p>And I'd have to admit that this very short piece of code exactly answers the question. But I'd also argue that there is very little chance of this code being reused. Don't get me wrong, you definitely shouldn't over engineer things but there should be some scope for <a href="http://en.wikipedia.org/wiki/Code_reuse">code reuse</a>.</p>
<blockquote><p>For such a simple problem you've over engineered this.</p></blockquote>
<p>or</p>
<blockquote><p>There's a better solutions that that... it's not efficient</p></blockquote>
<p>Is creating four methods over engieering? Does my code require any comments to provide documentation? There may well be a more performant solution to this, but that's not my point. My point is the way of approaching a question: the thought processes involved in understanding the problem and breaking it down to <a href="http://en.wikipedia.org/wiki/Separation_of_concerns">separate concerns</a>, making it easy to read, <a href="http://en.wikipedia.org/wiki/Code_reuse">reusable</a> and <a href="http://en.wikipedia.org/wiki/Self-documenting">self documenting</a>. If the code that worked out the odd numbers is not efficient it could easily be changed in one place without impacting the interface, the other methods within the class, or the overall functionality.</p>
<p>Some people may jump to the simplest solution but I think the way i've described approaching and solving the problem demonstrates good practice. If I'm completely honest I would normally approach the development of something such as this by writing a test case first since I practice <a href="http://en.wikipedia.org/wiki/Test-driven_development">TDD</a> but that can wait for another blog post.</p>

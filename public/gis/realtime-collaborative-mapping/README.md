# Realtime Collaborative Mapping

Frequently we encounter a business problem that requires a solution enabling multiple colleagues to capture information on a map at the same time, in a dynamic fashion.  One such use case may be a workshop event, where you want to capture locations favoured by attendees - you could try that at the Palm Springs dev summit, if you ask attendees to mark up a map with their home location, all done realtime, allowing the conversation to develop around the map edits - **realtime**.

Developments in Realtime Web technology (e.g. HTML5 WebSockets) now facilitate such solutions, in this example, edits are synchronised and persisted in realtime via a third party API.

## How to Use

### Choosing a map to edit

Every web map has a unique 'webmap' ID. Simply enter that ID and click "Go" or use one of the pre-selected maps.

### Editing a map

Select a drawing tool from the toolbar and start drawing on the map.

### Share a URL and start collaboratively editing in realtime

In order to start collaboratively editing just share the URL for the map your are currently viewing. You can do this by copying from the address bar or the in-app input box, or by scanning the QR code.

You can test this out yourself by opening up the same URL in two different browsers. **Better still**, copy the URL and share with your friends!

## What next?

* Security - Firebase provides an authentication mechanism which isn't in use in this application.
* Clean the code - Wow, it's tough getting all that functionality into 100 lines of JS
* Share the same map between groups - at the moment everybody on the map edits at the same time. It would be nice to be able to share the same map but with a unique ID which represents your version of the map.
* Versioning and edit history - easily acheived and definitely nice to have.
* Select, edit and delete individual graphics.
* Auto URL shortening - nicer for sharing.
* Add extent information to the URL for improved sharing.

## References

* ESRI
  * [ArcGIS API for JavaScript](http://help.arcgis.com/en/webapi/javascript/arcgis/index.html)
  * [How to add graphics to a map](http://help.arcgis.com/en/webapi/javascript/arcgis/jssamples/graphics_add.html)
  * [Class:Draw](http://help.arcgis.com/en/webapi/javascript/arcgis/jsapi/draw.html)
  * [webmap introduction](http://help.arcgis.com/en/webapi/javascript/arcgis/jshelp/intro_webmap.html)
  * [webmap example](http://www.arcgis.com/home/webmap/viewer.html?webmap=31aa8f2167c140bf8d30840d4cb7e411)
* Frameworks
  * [Firebase](http://firebase.com) for realtime synchronisation and persistence.
	* [Angular JS](http://angularjs.org/)
	* [jQuery](http://jquery.com/) *TODO: could be removed and replaced with just dojo functionality*.
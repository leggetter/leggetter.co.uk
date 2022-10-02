# Realtime Collaborative Mapping

Frequently we encounter a business problem that requires a solution enabling multiple colleagues capture information on a map at the same time, in a dynamic fashion.  One such use case may be a workshop event, where you want to capture locations favoured by attendees - you could try that at the Palm Springs dev summit, if you ask attendees to mark up a map with their home location, all done real time, allowing the conversation to develop around the map edits - real time.

Developments in Realtime Web technology (e.g. HTML5 WebSockets) now facilitate such solutions, in this example, edits are distributed in realtime via a third party API called Pusher.

## Choosing a map to edit

Every web map has a unique 'webmap' ID. Simply enter that ID and click "Go".

## Editing a map

Select a drawing tool from the toolbar and start drawing on the map.

## Share a URL and start editing

In order to start collaboratively editing just share the URL for the map your are currently viewing.

## References

* ESRI
  * [ArcGIS API for JavaScript](http://help.arcgis.com/en/webapi/javascript/arcgis/index.html)
  * [Add graphics to a map](http://help.arcgis.com/en/webapi/javascript/arcgis/jssamples/graphics_add.html)
  * [Class:Draw](http://help.arcgis.com/en/webapi/javascript/arcgis/jsapi/draw.html)
  * [webmap introduction](http://help.arcgis.com/en/webapi/javascript/arcgis/jshelp/intro_webmap.html)
  * [webmap example](http://www.arcgis.com/home/webmap/viewer.html?webmap=31aa8f2167c140bf8d30840d4cb7e411)
* Frameworks
	* [Angular JS](http://angularjs.org/)
	* [jQuery](http://jquery.com/) *TODO: could be removed and replaced with just dojo functionality*.
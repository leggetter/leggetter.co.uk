dojo.require("esri.arcgis.utils");
dojo.require("esri.toolbars.draw");

angular.module('collaboriative-mapping', []).
  config(function($routeProvider) {
    $routeProvider.
      when('/', {controller:ChooseMapCtrl, templateUrl:'views/choose.html'}).
      when('/map/:webmapId', {controller:MapViewCtrl, templateUrl:'views/map.html'}).
      otherwise({redirectTo:'/'});
  }); 
 
function ChooseMapCtrl($scope, $location) {
  $scope.choose = function( webmap ) {
  	if( webmap && webmap.id ) {
  		$location.path( 'map/' + webmap.id );
  	}
  };
}
ChooseMapCtrl.$inject = [ '$scope', '$location' ];

function MapViewCtrl($scope, $routeParams) {
	var self = this;
  this.webmapId = $routeParams.webmapId;

  $scope.toolbar = function( type ) {
  	if( !type ) {
  		self.toolbar.deactivate();
  	}
  	else {
  		self.toolbar.activate( esri.toolbars.Draw[ type ] );
  	}
  };

  dojo.ready( function() { self.dojoReady = true; self._createMap(); } );
  $scope.$on('$viewContentLoaded', function() { self.contentReady = true; self._createMap(); } );
}

MapViewCtrl.prototype._createMap = function() {
	var self = this;
	if( !this.dojoReady || !this.contentReady ) { return; }

	var mapDeferred = esri.arcgis.utils.createMap(this.webmapId, "map", {
    	mapOptions: { slider: true, nav:false }
  	});

	mapDeferred.then( function(response) {
		self.map = response.map;
		self._autoResize();
		self._addToolbars();
    self._addRealtime();
	} );
};

MapViewCtrl.prototype._addToolbars = function() {
  var self = this;
	self.toolbar = esri.toolbars.Draw(this.map);
	dojo.connect(self.toolbar, "onDrawEnd", function( geometry ) {
    self.mapRef.push( geometry.toJson() );
  } );
}

MapViewCtrl.prototype._addGraphic = function( geometry ) {
  var type = geometry.type;
  var symbol;
  if (type === "point" || type === "multipoint") {
    symbol = this.toolbar.markerSymbol;
  }
  else if (type === "line" || type === "polyline") {
    symbol = this.toolbar.lineSymbol;
  }
  else {
    symbol = this.toolbar.fillSymbol;
  }
	this.map.graphics.add( new esri.Graphic( geometry, symbol ) );
}

MapViewCtrl.prototype._addRealtime = function() {
  var self = this;
  self.firebase = new Firebase( 'https://collaborative-mapping.firebaseio.com/' );
  self.mapRef = self.firebase.child( 'maps/' + self.webmapId );
  self.mapRef.on('child_added', function( ref ) {
    self._addGraphic( esri.geometry.fromJson( ref.val() ), true );
  });
}

MapViewCtrl.prototype._autoResize = function() {
	var self = this;
	dojo.connect(self.map, 'resize', self, function(extent, width, height) { 
		self.map.__resizeCenter = self.map.extent.getCenter();
		setTimeout(function() {
			self.map.centerAt(self.map.__resizeCenter);
		}, 200);
	} );
	var resize = function() {
		jQuery( "#map" ).height( jQuery(window).height() - 50 );
		self.map.resize();
	};
	jQuery( window ).resize( resize );
	resize();
};
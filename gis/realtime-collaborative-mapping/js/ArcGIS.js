dojo.require("esri.arcgis.utils");
dojo.require("esri.toolbars.draw");

angular.module('collaboriative-mapping', []).
  config(function($routeProvider) {
    $routeProvider.when('/', {controller:ChooseMapCtrl, templateUrl:'views/choose.html'}).
                   when('/map/:webmapId', {controller:MapViewCtrl, templateUrl:'views/map.html'}).
                   otherwise({redirectTo:'/'});
  }); 
 
function ChooseMapCtrl($scope, $location) {
  $scope.choose = function( webmap ) {
  	if( webmap && webmap.id )
  		$location.path( 'map/' + webmap.id );
  };
}

function MapViewCtrl($scope, $routeParams, $location) {
	var self = this;
  self.webmapId = $routeParams.webmapId;
  $scope.shareUrl = $location.absUrl();
  $scope.encodedShareUrl = encodeURIComponent( $scope.shareUrl );
  $scope.toolbar = function( type ) {
  	if( type === 'CLEAR' ) {
      if( confirm( 'Are you sure you wish to delete all graphics?') ) {
        self.mapRef.remove(); // triggers child_removed
        self.map.graphics.clear();
      }
    }
    else {
      $scope.drawType = ( $scope.drawType === type? '' : type ); // toggle
      if( !$scope.drawType === '' )
        self.toolbar.deactivate();
      else
		    self.toolbar.activate( esri.toolbars.Draw[ type ] );
  	}
  };
  dojo.ready( function() { self.dojoReady = true; self._createMap(); } );
  $scope.$on('$viewContentLoaded', function() { self.contentReady = true; self._createMap(); } );
}

MapViewCtrl.prototype._createMap = function() {
	var self = this;
	if( !self.dojoReady || !self.contentReady ) return;

	esri.arcgis.utils.createMap( this.webmapId, "map", { mapOptions: { zoom: 4 } }).then( function( response ) {
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
    self.mapRef.push( geometry.toJson() ); // synchronise geometeries. Triggers child_added.
  } );
};

MapViewCtrl.prototype._addGraphic = function( name, geometry ) {
  var symbol = this.toolbar.fillSymbol;
  if (geometry.type === "point" || geometry.type === "multipoint")
    symbol = this.toolbar.markerSymbol;
  else if (geometry.type === "line" || geometry.type === "polyline")
    symbol = this.toolbar.lineSymbol;
  // firebase 'name' (auto generated when not supplied) used to uniquely identify geometries
	this.map.graphics.add( new esri.Graphic( geometry, symbol, { name: name } ) );
};

MapViewCtrl.prototype._addRealtime = function() {
  var self = this;
  self.mapRef = new Firebase( 'https://collaborative-mapping.firebaseio.com/maps/' + self.webmapId );
  this.mapRef.on('child_added', function( ref ) {
    self._addGraphic( ref.name(), esri.geometry.fromJson( ref.val() ) );
  });
  this.mapRef.on('child_removed', function( ref ) {
    for( var i = 0, l = self.map.graphics.graphics.length; i < l; ++i ) {
      if( self.map.graphics.graphics[ i ].attributes && self.map.graphics.graphics[ i ].attributes.name == ref.name() ) {
        self.map.graphics.remove( self.map.graphics.graphics[ i ] );
        break;
      }
    }
  });
}

MapViewCtrl.prototype._autoResize = function() {
	var self = this;
	dojo.connect(self.map, 'resize', function(extent, width, height) { 
		self.map.__resizeCenter = self.map.extent.getCenter();
		setTimeout( function() { self.map.centerAt(self.map.__resizeCenter ); }, 200);
	} );
	var resize = function() {
    dojo.byId( "map" ).style.height = ( dojo.window.getBox().h - 50 ) + 'px';
		self.map.resize();
	};
	dojo.connect( window, 'resize', resize );
	resize();
};
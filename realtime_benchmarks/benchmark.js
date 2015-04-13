(function() {

	head.js('http://cdn.pubnub.com/pubnub.min.js',
				'http://js.pusher.com/2.1/pusher.min.js',
				'http://dfdbz2tdq3k01.cloudfront.net/js/2.1.0/ortc.js',
				'https://cdn.firebase.com/js/client/1.0.17/firebase.js',
				'http://cdn.hydna.com/1/hydna.js',
				'http://pubsub.fanout.io/static/json2.js',
				'/realtime_benchmarks/service-libs/fanout.js',
				'https://cdn.datamcfly.com/DataMcFly.js',
				'/realtime_benchmarks/realtime-benchmarks.min.js',
				init );

	function init() {
		Pusher.channel_auth_endpoint = 'http://phobos7.co.uk/leggetter/realtime_benchmarks/pusher_auth.php';
		setTimeout( runBenchmark, 0 );
	}

	function log( msg ) {
		if( console && console.log ) {
			console.log( msg );
		}
	}
	
	var geoRequestEl = null;
	function showGeoLocationRequestReason() {
		geoRequestEl = document.createElement('div');
		geoRequestEl.style.position = "fixed";
		geoRequestEl.style.display = "block";
		geoRequestEl.style.width = "100%";
		geoRequestEl.style.textAlign = "center";
		geoRequestEl.style.padding = "5px";
		geoRequestEl.style.top = "0px";
		geoRequestEl.style.border = "1px solid #1E2432";
		geoRequestEl.style.backgroundColor = "#fff";
		geoRequestEl.style.color = "#919499";
		geoRequestEl.innerHTML = "This site would like your geolocation in order to improve the <a href=\"/real-time-web-technologies-guide/realtime-hosted-service-latency/\">Real-Time Hosted Service Latency Statistic</a> it's gathering.";
		
		document.body.appendChild(geoRequestEl);
		
		document.body.style.marginTop = "20px";	
	}
	
	function hideGeoLocationRequestReason() {
		document.body.style.marginTop = "0";
		geoRequestEl.style.display = "none";
	}

	function runBenchmark(){

		var services = [
						PubNubService,
						PusherService,
						RealtimeCoService,
						FirebaseService,
						HydnaService,
						FanoutService,
						DataMcFlyService
				];

		var position = null,
				result = null;

		if ( navigator.geolocation ) {
			navigator.geolocation.getCurrentPosition( foundGeolocation, hideGeoLocationRequestReason );
			
			showGeoLocationRequestReason();
		}

		function foundGeolocation( pos ) {
			hideGeoLocationRequestReason();
			
			position = pos;

			if( !result ) {
				log( 'no result exists. cannot update geolocation' );
			}
			else {
				result.location = position;

				if( jQuery ) {
					var postData = {};
					postData.id = result.id;
					delete result.id;
					postData.data = JSON.stringify( result );

					jQuery.ajax( {
						url: 'http://phobos7.co.uk/leggetter/realtime_benchmarks/update_result.php',
						type: 'post',
						data: postData
					});
				}
			}

		}

		var runner = new BenchmarkRunner( services, {
			logToConsole: false,
			completed: function( results ) {

				var postData = {
					latencyResults: results,
					location: position,
					userAgent: navigator.userAgent
				};

				if( jQuery ) {
					jQuery.ajax( {
						url: 'http://phobos7.co.uk/leggetter/realtime_benchmarks/?' + (new Date().getTime()).toString(),
						type: 'post',
						data: JSON.stringify( postData ),
						dataType: 'json',
						success: function( data ) {
							postData.id = data.id;
							result = postData;
						}
					});
				}
			}
		} );

		runner.start();

	}

})();

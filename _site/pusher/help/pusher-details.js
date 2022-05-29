var PUSHER_HELP = {};
PUSHER_HELP._query;
PUSHER_HELP.getQueryValue = function(name, defaultValue) {
	if(PUSHER_HELP._query === undefined) {
		var i;
		var param;
		var params = document.location.search.split("&");
		params[0] = params[0].substring(1, params[0].length);
		var nameValues = {};
		for(i = 0, l = params.length; i < l; i=i+1) {
			param = params[i].split("=");
			nameValues[ param[0] ] = param[1];
		}
		
		PUSHER_HELP._query = nameValues;
	}
	var value = PUSHER_HELP._query[name];
	return (value?value:defaultValue);
};
PUSHER_HELP.KEY = PUSHER_HELP.getQueryValue("key", "da6da0f4862846b74325");
Pusher.host = PUSHER_HELP.getQueryValue("host", "ws.pusherapp.com");
Pusher.ws_port = PUSHER_HELP.getQueryValue("ws", 80);
Pusher.wss_port = PUSHER_HELP.getQueryValue("wss", 443);
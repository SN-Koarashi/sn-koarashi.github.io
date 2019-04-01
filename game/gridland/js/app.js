requirejs.config({
	baseUrl: "js/lib",
	shim: {
		"google-analytics": {
			exports: "ga"
		},
		"base64": {
			exports: "Base64"
		}
	},
	paths: {
		app: "../app",
		"jquery": [
			"https://ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min",
			"jquery-2.0.3.min"
		],
		"google-analytics": [
	        "https://www.google-analytics.com/analytics",
	        "analytics"
        ]
	},
	waitSeconds: 0
});

// Load the main module to start the game
requirejs(["app/main"]);

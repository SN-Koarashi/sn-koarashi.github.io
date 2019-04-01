define(function() {
	
	var providers = [];
	
	var _el = null;
	
	return {
		init: function() {
			require('app/graphics/graphics').addToMenu(el());
		}
	};
});
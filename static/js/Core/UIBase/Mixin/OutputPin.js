//=================================
// OutputPin.js
//=================================
define(function(require, exports, module){

	var Pin = require('./Pin');

	_.extend(exports, {
		className : 'lblend-pin-output',
		tag : 'OUTPUTPIN'
	})

	_.defaults(exports, Pin);
})
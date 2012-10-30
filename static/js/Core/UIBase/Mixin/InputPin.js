//=================================
// InputPin.js
//=================================
define(function(require, exports, module){

	var Pin = require('./Pin');

	_.extend(exports, {
		className : 'lblend-pin-input',
		tag : 'INPUTPIN'
	})

	_.defaults(exports, Pin);
})
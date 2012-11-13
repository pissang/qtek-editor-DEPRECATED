//==========================================
//index.js
//加载当前目录下的所有组件
//==========================================
define(function(require, exports, module){

	exports.Collapsable = require('./Collapsable');
	exports.Scrollable 	= require('./Scrollable');
	exports.InputPin 	= require('./InputPin');
	exports.OutputPin 	= require('./OutputPin');
	exports.Pin 		= require('./Pin');
	exports.Acceptable 	= require('./Acceptable');

})

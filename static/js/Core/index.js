//==========================================
//index.js
//加载当前目录下的所有组件
//==========================================
define(function(require, exports, module){

	exports.Hub 	= require('./Hub');
	exports.svg 	= require('./svg');
	exports.MouseEventDispatcher = require('./MouseEventDispatcher');
	exports.Assets 	= require('./Assets/index');
	exports.UIBase 	= require('./UIBase/index');
})

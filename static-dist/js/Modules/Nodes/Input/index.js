//==========================================
//index.js
//加载当前目录下的所有组件
//==========================================
define(function(require, exports, module){

	exports.Camera 	= require('./Camera'); 
	exports.Scene 	= require('./Scene');
	exports.Texture = require('./Texture'); 
	exports.Video 	= require('./Video');
	exports.Timer 	= require('./Timer');
	exports.Value 	= require('./Value');

})

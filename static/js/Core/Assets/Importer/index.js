//==========================================
//index.js
//加载当前目录下的所有组件
//==========================================
define(function(require, exports, module){

	exports.Binary 	= require('./Binary');
	exports.Collada = require('./Collada');
	exports.JSON 	= require('./JSON');
	exports.Zip 	= require('./Zip');
	exports.Image = require('./Image');
	exports.DDS = require('./DDS');

})
//==========================================
//index.js
//加载当前目录下的所有组件
//==========================================
define(function(require, exports, module){

	exports.Button 		= require('./Button'); 
	exports.Checkbox 	= require('./Checkbox');
	exports.Float 		= require('./Float');
	exports.Image 		= require('./Image');
	exports.Input 		= require('./Input');
	exports.Label 		= require('./Label');
	exports.Color 		= require('./Color');
	exports.Layer 		= require('./Layer'); 
	exports.Link 		= require('./Link'); 
	exports.Node 		= require('./Node');
	exports.Panel 		= require('./Panel');
	exports.Select 		= require('./Select');
	exports.Texture 	= require('./Texture');
	exports.Tree 		= require('./Tree');
	exports.Vector 		= require('./Vector');
	exports.Video 		= require('./Video');
	exports.Tab 		= require('./Tab');
	exports.Mixin 		= require('./Mixin/index');
})

//==========================================
//index.js
//加载当前目录下的所有组件
//==========================================
define(function(require, exports, module){

	exports.Geometry 	= require('./Geometry');
	exports.Material 	= require('./Material');
	exports.Prefab 		= require('./Prefab');
	exports.Shader		= require('./Shader');
	exports.Texture 	= require('./Texture');
	exports.TextureCube = require('./TextureCube');
	exports.FileSystem 	= require('./FileSystem');
	exports.Util 		= require('./Util');
	exports.Importer 	= require('./Importer/index');

})

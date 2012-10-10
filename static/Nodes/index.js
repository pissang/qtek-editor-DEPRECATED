//==========================================
//index.js
//加载当前目录下的所有组件
//==========================================
define(function(require, exports, module){

	var modules = ['Base', 
					'Filter',
					'Viewer'];

	var modulesPath = [];
	for(var i = 0; i < modules.length; i++){
		modulesPath.push('./'+modules[i]);
	}

	require.async(modulesPath, function(){

		for(var i = 0; i < arguments.length; i++){
			
			exports[ modules[i] ] = arguments[i];
		}
	})
})
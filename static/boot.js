//======================
//boot.js
//======================

(function(){
	var libPath = 'lib/';

	// loading libs
	$LAB.setOptions({'BasePath':libPath})
		.script('sea.js')
		.script('three.min.js')
		.script('loader/ColladaLoader.js')
		.script('jquery.min.js').wait()
		// jquery plugins
		.script('colorpicker/colorpicker.js')
		.script('jquery.mousewheel.js')
		.script('jquery-ui/js/jquery-ui-1.8.23.custom.min.js')
		// jlayout
		.script('jquery.layout.min.js').wait()
		.script('underscore.js')
		.script('backbone.js')
		.script('rivets.js')
		//codemirror lib
		.script('codemirror/codemirror.js')	
		.script('codemirror/mode/javascript/javascript.js')
		//zip
		.script('zip/zip.js')
		.script('zip/mime-types.js')
		//post processing
		.script('PostProcessing.js')
		.script('Goo.v2.js')
		.wait(boot)
		//

	function boot(){
		// some config
		_.templateSettings = {
		  interpolate : /\{\{(.+?)\}\}/g
		};
		jQuery.event.props.push("dataTransfer");

		zip.workerScriptsPath = 'lib/zip/';

		// adapter to backbone.js
		rivets.configure({
		  adapter: {
		    subscribe: function(obj, keypath, callback) {
		      obj.on('change:' + keypath, callback);
		    },
		    unsubscribe: function(obj, keypath, callback) {
		      obj.off('change:' + keypath, callback);
		    },
		    read: function(obj, keypath) {
		      return obj.get(keypath);
		    },
		    publish: function(obj, keypath, value) {
		      obj.set(keypath, value);
		    }
		  }
		});
		// dependencies
		seajs.use([
					//////// ui modules
					'./UIBase/Button',
					'./UIBase/Checkbox',
					'./UIBase/Color',
					'./UIBase/Float',
					'./UIBase/index',
					'./UIBase/Layer',
					'./UIBase/Input',
					'./UIBase/Label',
					'./UIBase/Link',
					'./UIBase/Node',
					'./UIBase/Panel',
					'./UIBase/Select',
					'./UIBase/Texture',
					'./UIBase/Tree',
					'./UIBase/Vector',
					'./UIBase/Video',
					'./UIBase/Tab',
					//////// UIBase mixins
					'./UIBase/Mixin/index',
					'./UIBase/Mixin/Pin',
					'./UIBase/Mixin/Scrollable',
					'./UIBase/Mixin/InputPin',
					'./UIBase/Mixin/OutputPin',
					'./UIBase/Mixin/Collapsable',
					/////// Modules
					'./Modules/Hub',
					'./Modules/Project',
					'./Modules/MouseEventDispatcher',
					'./Modules/Scene',
					'./Modules/Compositor',
					//////// compositor nodes
					'./Modules/Nodes/Base',
					'./Modules/Nodes/Filter',
					'./Modules/Nodes/index',
					'./Modules/Nodes/Input/index',
					'./Modules/Nodes/Input/Camera',
					'./Modules/Nodes/Input/Scene',
					'./Modules/Nodes/Input/Texture',
					'./Modules/Nodes/Input/Video',
					'./Modules/Nodes/Input/Timer',
					'./Modules/Nodes/Viewer',
					'./Modules/Script',
					'./Modules/Sound',
					'./Modules/Inspector',
					'./Modules/Hierarchy',
					'./Modules/Menu',
					'./Modules/Console',
					'./Modules/Animation',
					'./Modules/Project',
					///////////Asset
					'./Modules/Assets/Util',
					'./Modules/Assets/FileSystem',
					'./Modules/Assets/Geometry',
					'./Modules/Assets/Material',
					'./Modules/Assets/Texture',
					'./Modules/Assets/TextureCube',
					'./Modules/Assets/Prefab',
					'./Modules/Assets/Importer/Binary',
					'./Modules/Assets/Importer/JSON',
					'./Modules/Layouts',
					////////app 
					'./svg',
					'./config',
				], function(){
			
			seajs.use('./app')
		})
	}
})()


//======================
//boot.js
//======================

(function(){
	var libPath = 'lib/';

	// loading libs
	$LAB.setOptions({'BasePath':libPath})
		.script('sea.js')
		.script('THREE.min.js')
		.script('loader/ColladaLoader.js')
		.script('jquery.min.js').wait()
		// jquery plugins
		.script('colorpicker/colorpicker.js')
		.script('jquery.mousewheel.js')
		.script('jquery-ui/js/jquery-ui-1.8.23.custom.min.js')
		// jlayout
		.script('jlayout/jquery.sizes.js').wait()
		.script('jlayout/jlayout.grid.js').wait()
		.script('jlayout/jlayout.flexgrid.js').wait()
		.script('jlayout/jquery.jlayout.js').wait()
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
					'./UI/Button',
					'./UI/Checkbox',
					'./UI/Color',
					'./UI/Float',
					'./UI/index',
					'./UI/Layer',
					'./UI/Input',
					'./UI/Label',
					'./UI/Link',
					'./UI/Node',
					'./UI/Panel',
					'./UI/Select',
					'./UI/Texture',
					'./UI/Vector',
					'./UI/Video',
					'./UI/Tab',
					//////// ui mixins
					'./UI/Mixin/index',
					'./UI/Mixin/Pin',
					'./UI/Mixin/Scrollable',
					'./UI/Mixin/InputPin',
					'./UI/Mixin/OutputPin',
					'./UI/Mixin/Collapsable',
					//////// ui layout
					'./UI/Layout/Grid',
					'./UI/Layout/Tab',
					//////// node modules
					'./Nodes/Base',
					'./Nodes/Filter',
					'./Nodes/index',
					'./Nodes/Input/index',
					'./Nodes/Input/Camera',
					'./Nodes/Input/Scene',
					'./Nodes/Input/Texture',
					'./Nodes/Input/Video',
					'./Nodes/Input/Timer',
					'./Nodes/Viewer',
					/////// layers
					'./Layers/Hub',
					'./Layers/Project',
					'./Layers/MouseEventDispatcher',
					'./Layers/Scene',
					'./Layers/Compositor',
					'./Layers/Script',
					'./Layers/Sound',
					'./Layers/Inspector',
					'./Layers/Hierarchy',
					'./Layers/Menu',
					'./Layers/Console',
					'./Layers/Animation',
					'./Layers/Asset',
					//////// app
					'./svg',
					'./config'
				], function(){
			
			seajs.use('./app')
		})
	}
})()


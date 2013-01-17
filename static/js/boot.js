//======================
//boot.js
//======================

(function(){
	var libPath = 'js/lib/';

	// loading libs
	$LAB.setOptions({'BasePath':libPath})
		.script('sea.js')
		.script('three.js')
		.script('loader/ColladaLoader.js')
		.script('jquery.min.js').wait()
		// jquery plugins
		.script('jquery.mousewheel.js')
		.script('jquery-ui.min.js')
		.script('spectrum.js')
		
		.script('jquery.layout.min.js').wait()
		.script('underscore.js')
		.script('backbone.js')
		.script('rivets.js')
		//codemirror lib
		.script('codemirror/codemirror.js')	
		.script('codemirror/javascript.js')
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

		zip.workerScriptsPath = 'js/lib/zip/';

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
					'./js/Core/Hub',
					'./js/Core/svg',
					'./js/Core/MouseEventDispatcher',
					'./js/Core/TExtend.js',
					//////// ui modules
					'./js/Core/UIBase/Button',
					'./js/Core/UIBase/Checkbox',
					'./js/Core/UIBase/Color',
					'./js/Core/UIBase/Float',
					'./js/Core/UIBase/Image',
					'./js/Core/UIBase/index',
					'./js/Core/UIBase/Layer',
					'./js/Core/UIBase/Input',
					'./js/Core/UIBase/Label',
					'./js/Core/UIBase/Link',
					'./js/Core/UIBase/Node',
					'./js/Core/UIBase/Panel',
					'./js/Core/UIBase/Select',
					'./js/Core/UIBase/Texture',
					'./js/Core/UIBase/Tree',
					'./js/Core/UIBase/Vector',
					'./js/Core/UIBase/Video',
					'./js/Core/UIBase/Tab',
					'./js/Core/UIBase/AssetPreview',
					'./js/Core/UIBase/MaterialPreview',
					'./js/Core/UIBase/PrefabPreview',
					///////// UIBase mixins
					'./js/Core/UIBase/Mixin/index',
					'./js/Core/UIBase/Mixin/Pin',
					'./js/Core/UIBase/Mixin/Scrollable',
					'./js/Core/UIBase/Mixin/InputPin',
					'./js/Core/UIBase/Mixin/OutputPin',
					'./js/Core/UIBase/Mixin/Collapsable',
					'./js/Core/UIBase/Mixin/Acceptable',
					///////////Asset
					'./js/Core/Assets/Util',
					'./js/Core/Assets/FileSystem',
					'./js/Core/Assets/Geometry',
					'./js/Core/Assets/Material',
					'./js/Core/Assets/Texture',
					'./js/Core/Assets/TextureCube',
					'./js/Core/Assets/Prefab',
					'./js/Core/Assets/Importer/Binary',
					'./js/Core/Assets/Importer/JSON',
					'./js/Core/Assets/Importer/Collada',
					'./js/Core/Assets/Importer/Zip',
					'./js/Core/Assets/Importer/Image',
					'./js/Core/Assets/Importer/DDS'
				], function(){
			
			seajs.use('./js/app')
		})
	}
})()


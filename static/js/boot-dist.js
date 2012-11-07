//======================
//boot.dist.js
//boot.js template of distribution
//======================

(function(){
	// loading libs
	$LAB.script('js/lib/lib.js')
		.wait(boot);
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

		//extends event to tree.js object
		_.extend(THREE.Object3D.prototype, Backbone.Events);
		// dependencies
		seajs.use([
					'./js/Core/index.js'
				], function(){
			
			seajs.use('./js/app')
		})
	}
})()


//================
// TExtend.js
// extend three.js object
// no export
//=================
define(function(require, exports, module){

	//extends event to tree.js object
	_.extend(THREE.Object3D.prototype, Backbone.Events);
	_.extend(THREE.Material.prototype, Backbone.Events);
	_.extend(THREE.Texture.prototype, Backbone.Events);

	_.extend(THREE.Object3D.prototype, {
		getConfig : function(){

			return getTransformConfig(this);
		}
	})

	_.extend(THREE.Mesh.prototype, {
		getConfig : function(){

			var config = getTransformConfig(this);
			// not inspect default material
			if( this.material && ! this.material.__default__ ){	
				// material asset config
				_.extend(config, this.material.host.getConfig() );
			}
			return config;
		}
	})

	_.extend(THREE.Light.prototype, {

		getConfig : function(){
			var self = this;
			var config = getTransformConfig(this);
			// material asset config
			_.extend(config, {
				'Light' : {
					type : 'layer',
					'class' : 'light',
					sub : {
						'color' : {
							type : 'color',
							value : this.color.getHex(),
							onchange : function(value){
								self.color.setHex(value);
							}
						}		
					}
				}
			})
			return config;
		}
	})

	var getTransformConfig = function(obj){

		return {
			'Transform' : {
				type : 'layer',
				'class' : 'transform',
				sub : {
					'position' : {
						type : 'vector',
						value : {
							x : obj.position.x,
							y : obj.position.y,
							z : obj.position.z
						},
						min : -10000,
						max : 10000,
						step : 1,
						onchange : function(key, value){
							var tmp = {};
							tmp[key] = value;
							obj.trigger('update:position', tmp);
						}
					},
					'rotation' : {
						type : 'vector',
						value : {
							x : obj.rotation.x,
							y : obj.rotation.y,
							z : obj.rotation.z
						},
						min : -10000,
						max : 10000,
						step : 1,
						onchange : function(key, value){
							var tmp = {};
							tmp[key] = value;
							obj.trigger('update:rotation', tmp);
						}
					},
					'scale' : {
						type : 'vector',
						value : {
							x : obj.scale.x,
							y : obj.scale.y,
							z : obj.scale.z
						},
						min : -1000,
						max : 1000,
						step : 0.1,
						onchange : function(key, value){
							var tmp = {};
							tmp[key] = value;
							obj.trigger('update:scale', tmp);
						}
					}
				}
			}
		}
	}
})
//================
// TExtend.js
// extend three.js object
// no export
//=================
define(function(require, exports, module){

	var FS = require('./Assets/FileSystem');

	//extends event to tree.js object
	_.extend(THREE.Object3D.prototype, Backbone.Events);
	_.extend(THREE.Material.prototype, Backbone.Events);
	_.extend(THREE.Texture.prototype, Backbone.Events);

	_.extend(THREE.Object3D.prototype, {

		getPath : function( ){
			var node = this;
			var path = node.name;
			while(node.parent){
				node = node.parent;
				path = node.name + '/' + path;
			}
			return path;
		},

		getNode : function(path){
			if( path instanceof THREE.Object3D ){
				return path;
			}else if( ! _.isString(path) ){
				return;
			}

			var root = this;
			if( path.charAt(0) == '/'){
				path = path.substring(1);
				root = this.getScene(root);
				// remove scene
				path = path.substring(root.name.length);
			}

			return _.reduce(_.compact(path.split('/')), function(node, name){
				if( ! node){
					return;
				}
				return node.getChildByName(name); 
			}, root);
		},

		getScene : function(){
			var root = this;
			while(root.parent){
				root = root.parent;
			}
			return root;
		}

	})

	_.extend(THREE.Object3D.prototype, {
		getConfig : function(){

			return getTransformConfig(this);
		}
	})

	_.extend(THREE.Mesh.prototype, {

		getConfig : function(){
			var self = this;
			var config = getTransformConfig(this);
			// material asset config
			_.extend(config, {
				"Material Preview" : {
					type : "layer",
					"class" : "material-preview",
					sub : {
						"preview" : {
							type : "materialpreview",
							value : (function(){
								// only inspect material in the project
								if(self.material && self.material.host){
									return self.material.host.getPath();
								}else{
									return '';
								}
							})(),
							onchange : function(path){
								var matFile = FS.root.find(path);
								if( ! matFile ){
									console.warn('material '+path+' not found in project');
									return;
								}
								var matAsset = matFile.data;
								self.material = matAsset.data;
							},
							acceptConfig : {
								'project' : {
									accept : function(json){
										if( ! (json instanceof FileList)
											&& json.owner == 'project'
											&& json.dataType == 'material'){
											return true;
										}
									},
									accepted : function(json, setModel){
										if(json.dataSource){
											setModel({
												path : json.dataSource
											})
										}
									}
								}
							}
						}
					}
				}
			} );
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
							x : obj.rotation.x*180/Math.PI,
							y : obj.rotation.y*180/Math.PI,
							z : obj.rotation.z*180/Math.PI
						},
						min : -10000,
						max : 10000,
						step : 1,
						onchange : function(key, value){
							var tmp = {};
							// degree to radians
							tmp[key] = value/180*Math.PI;
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
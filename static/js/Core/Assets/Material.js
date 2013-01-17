//========================
// Material.js
//
// Basic Material Asset
// Save an material instance, which can be imported and exported as a json format asset
// file extension, material
//========================
define(function(require, exports, module){

	var ShaderAsset = require('./Shader');
	var FS = require('./FileSystem');

	var guid = 0;

	function create(mat){

		var name = mat && mat.name;
		mat = convertMaterial(mat);

		var ret = {

			type : 'material',

			name : name || 'Material_' + guid++,

			data : mat || null,

			host : null,

			// textureScope is a function to query a texture
			import : function(json, textureScope){
				this.data = read(json, textureScope);

				this.data.host = this;

				if( json.name ){
					this.name = json.name;
				}

				return this.data;
			},
			bindShader : function(shader){
				bindShader( this.data, shader);
			},
			toJSON : function(){
				return toJSON( this.data );
			},
			getInstance : function(){
				// return material directly
				return this.data;
			},
			getCopy : function(){
				return getCopy( this.data );
			},
			getThumb : function(size){
				return getThumb( this.data, size);
			},
			getConfig : function(){
				return getConfig( this.data );
			},
			getPath : function(){
				if( this.host){
					return this.host.getPath();
				}
			}
		}

		mat && (mat.host = ret);

		return ret;
	}

	// we drop all the material types in THREE.js and leave a ShaderMaterial
	// to manage shaders, to keep material management more clearly;
	var uniformPropMap = {
		'phong' : {
			'diffuse' : 'color',
			'ambient' : 'ambient',
			'emissive' : 'emissive',
			'specular' : 'specular',
			'shininess' : 'shininess',
			'map' : 'map',
			'lightMap' : 'lightMap',
			'bumpMap' : 'bumpMap',
			'bumpScale' : 'bumpScale',
			'normalMap' : 'normalMap',
			'normalScale' : 'normalScale',
			'specularMap' : 'specularMap',
			'envMap' : 'envMap',
			'reflectivity' : 'reflectivity',
			'refractionRatio' : 'refractionRatio'
		},
		'lambert' : {
			'diffuse' : 'color',
			'ambient' : 'ambient',
			'emissive' : 'emissive',
			'map' : 'map',
			'lightMap' : 'lightMap',
			'specularMap' : 'specularMap',
			'envMap' : 'envMap',
			'reflectivity' : 'reflectivity',
			'refractionRatio' : 'refractionRatio'
		},
		'basic' : {
			'diffuse' : 'color',
			'map' : 'map',
			'lightMap' : 'lightMap',
			'specularMap' : 'specularMap',
			'envMap' : 'envMap',
			'reflectivity' : 'reflectivity',
			'refractionRatio' : 'refractionRatio'
		}
	}

	function convertMaterial(mat){
		var newMat;
		// convert other material types to shader material
		if( ! mat.shader ){
			if( mat instanceof THREE.MeshPhongMaterial){
				var shader = ShaderAsset.buildin['buildin-phong'].getInstance();
				_.each(uniformPropMap.phong, function(pName, uName){
					shader.uniforms[uName].value = mat[pName]
				})

				newMat = new THREE.ShaderMaterial;

				bindShader(newMat, shader);
			}
			else if( mat instanceof THREE.MeshLambertMaterial){
				var shader = ShaderAsset.buildin['buildin-lambert'].getInstance();
				_.each(uniformPropMap.lambert, function(pName, uName){
					shader.uniforms[uName].value = mat[pName]
				})
				newMat = new THREE.ShaderMaterial;
				
				bindShader(newMat, shader);
			}
			else if( mat instanceof THREE.MeshBasicMaterial){
				var shader = ShaderAsset.buildin['buildin-basic'].getInstance();
				_.each(uniformPropMap.basic, function(pName, uName){
					shader.uniforms[uName].value = mat[pName]
				})
				newMat = new THREE.ShaderMaterial;
				
				bindShader(newMat, shader);
			}
			else if(mat instanceof THREE.ShaderMaterial){
				newMat = mat;
				// create a shader asset;
				var shaderAsset = ShaderAsset.create(new ShaderAsset.Shader({
					uniforms : mat.uniforms,
					fragmentShader : mat.fragmentShader,
					vertexShader : mat.vertexShader
				}))
				bindShader(mat, shaderAsset.data);
			}
			//need to set the light true so the renderer will set the light params in as uniform
			//whats the fuck
			newMat.lights = true;	
			newMat.name = mat.name;
		}else{
			newMat = mat;
		}
		return newMat;
	}

	function read(m){

		var material = new THREE.ShaderMaterial;
		var shader = ShaderAsset.create();
		shader.import(material.shader);

		if(shader){
			bindShader( material, shader);
		}else{
			console.warn('shader '+m.shader+' not found');
		}

		return material;
	}

	function bindShader(material, shader){

		// get a shader copy
		shader = ShaderAsset.getInstance(shader);
		material.shader = shader;

		// also save these for three.js		
		material.uniforms = shader.uniforms;
		material.fragmentShader = shader.fragmentShader;
		material.vertexShader = shader.vertexShader;
		// enable the build-in materials map 
		_.each(shader.uniforms, function(u, name){
			if(u.type == 't'){
				if(name == 'map' ||
					name == 'lightMap' ||
					name == 'specularMap' ||
					name == 'envMap' ||
					name == 'normalMap' ||
					name == 'bumpMap'){

					if(u.value){
						material[name] = true;
					}
				}
			}
		})
		material.needsUpdate = true;
	}

	function toJSON( material ){

		var json = {
			name : material.name,
			shader : this.shader.toJSON(),
		}
		
		return json;
	}

	function getCopy( mat ){

		var clonedMat = new THREE.ShaderMaterial();
		clonedMat.lights = true;
		clonedMat.name = mat.name;

		var shader = ShaderAsset.getCopy( mat.shader );
		bindShader(clonedMat, shader);
		
		return clonedMat;
	}

	// some ugly codes
	var previewLight = new THREE.DirectionalLight( 0xffffff );
	previewLight.position = new THREE.Vector3(2,2,2);
	var previewCamera = new THREE.PerspectiveCamera( 60, 1, 0.01, 10 );
	previewCamera.position.set(0.4, 0.4, 1.6);
	previewCamera.lookAt(new THREE.Vector3( 0, 0, 0 ));
	var previewRenderer = new THREE.WebGLRenderer( );
	var previewScene = new THREE.Scene();
	previewScene.add(previewLight);
	var previewSphereGeo = new THREE.SphereGeometry( 0.73, 10, 10 );

	function getThumb( mat, size){
		// get a clean copy of material
		var mesh = new THREE.Mesh(previewSphereGeo, getCopy(mat) );
		previewScene.add(mesh);
		previewRenderer.render(previewScene, previewCamera);
		previewRenderer.setSize(size, size);
		previewScene.remove(mesh);

		return previewRenderer.domElement.toDataURL();
	}

	function getConfig( material ){
		
		var props = {
			'name' : {
				type : 'input',
				value : material.name,
				onchange : function(value){
					material.name = value;
					material.host.name = value;
					material.host.host.setName(value);
				}
			},
			'shader' : {
				type : 'select',
				options : [{
					value : 'buildin-basic',
					description : 'Buildin Basic'
				},{
					value : 'buildin-lambert',
					description : 'Buildin Lambert'
				},{
					value : 'buildin-phong',
					description : 'Buildin Phong'
				},{
					value : 'custom',
					description : 'custom'
				}],
				value : (function(){
					var path = material.shader.host.getPath();
					// is a build in shader
					if( ShaderAsset.buildin[ path ] ){
						return path;
					}else{
						return 'custom'
					}
				})(),
				onchange : function(value, updatePartial){
					// build in shader
					if( ShaderAsset.buildin[value] ){

						bindShader( material, ShaderAsset.buildin[value].getInstance() );
					}else{
						var shader = FS.root.find(value);
						if( ! shader){
							console.warn( 'shader '+value+' not exist');
						}
						//query the shader;
						bindShader( material,  shader);
					}

					// update Shader Asset Part
					updatePartial && updatePartial( 'Shader' );
				}

			},
			'opacity' : {
				type : 'float',
				min : 0,
				max : 1,
				step : 0.005,
				value : material.opacity,
				onchange : function(value){
					material.opacity = value;
				}
			},
			'transparent' : {
				type : 'boolean',
				value : material.transparent,
				onchange : function(value){
					material.transparent = value;
				}		
			}
		}

		var shaderProps = {};

		_.each(material.shader.uniforms, function(u, name){
			
			if( ! u.configurable){
				return;
			}

			var prop = {};
			_.extend(prop, u);

			switch(u.type){
				case 'f':
					prop.type = 'float';
					prop.onchange = function(value){

						material.uniforms[name].value = value;
					}
					break;
				case 't':
					prop.type = 'texture';
					var tex = material.uniforms[name].value;
					if( ! tex){
						prop.value = '';
					}
					else if( ! tex.host){
						console.warn('texture '+tex.name+' is not in the project');
						return;
					}
					else{
						prop.value = tex.host.getPath();	// texture path in the project
					}

					prop.onchange = function(value){
						// delete the texture when the value is ''
						if( ! value){
							material.uniforms[name].value = null;
								if(name == 'map' ||
									name == 'lightMap' ||
									name == 'specularMap' ||
									name == 'envMap' ||
									name == 'normalMap' ||
									name == 'bumpMap'){

								material[name] = false; 
								material.needsUpdate = true;
							}
						}
						else{
							var texAsset = FS.root.find(value).data;
							if( ! texAsset){
								console.warn('texture '+value+' is not in the project');
								return;
							}
							material.uniforms[name].value = texAsset.data;

							if(name == 'map' ||
								name == 'lightMap' ||
								name == 'specularMap' ||
								name == 'envMap' ||
								name == 'normalMap' ||
								name == 'bumpMap'){

								material[name] = true;
								material.needsUpdate = true;
							}
						}
					}

					prop.acceptConfig = {
						'texture' : {
							'accept' : function(json){
								if( ! (json instanceof FileList) 
									&& json.owner == 'project'
									&& (json.dataType == 'texture' 
										||json.dataType == 'texturecube') ){
									return true;
								}
							},
							'accepted' : function(json, setModel){
								if(json.dataSource){
									setModel({
										path : json.dataSource
									})
								}
							}
						}
					}
					break;
				case 'v2':
					prop.value = _.pick(u.value, 'x', 'y');
				case 'v3':
					prop.value = _.pick(u.value, 'x', 'y', 'z');
				case 'v4':
					prop.value = _.pick(u.value, 'x', 'y', 'z', 'w');
					prop.type = 'vector';
					prop.onchange = function(key, value){
						material.uniforms[name].value[key] = value;
					}
					break;
				case 'c':
					prop.type = 'color';
					prop.value = u.value.getHex();
					prop.onchange = function(value){
						material.uniforms[name].value.setHex(value);
					}

					break;
			}

			shaderProps[name] = prop;
		})
		
		return {

			'Material' : {
				type : 'layer',
				sub : props
			},

			'Shader' : {
				type : 'layer',
				sub : shaderProps
			},

			"Preview" : {
				type : "layer",
				"class" : "material-preview",
				sub : {
					"preview" : {
						type : "materialpreview",
						value : (function(){
							// only inspect material in the project
							if(material && material.host){
								return material.host.getPath();
							}else{
								return '';
							}
						})(),
						onchange : function(path){
							var matAsset = FS.root.find(path);
							if( ! matAsset ){
								console.warn('material '+path+' not found in project');
								return;
							}
							material = matAsset.data;
						}
					}
				}
			}
		}
	}

	exports.create = create;
	// static functions
	exports.toJSON = toJSON;

	exports.bindShader = bindShader;

	exports.getCopy = getCopy;

	exports.getConfig = getConfig;

	exports.convertMaterial = convertMaterial;
})
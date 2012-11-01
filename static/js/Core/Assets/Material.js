//========================
// Material.js
//
// Basic Material Asset
// Save an material instance, which can be imported and exported as a json format asset
// file extension, material
//========================
define(function(require, exports, module){

	var ShaderAsset = require('./Shader');

	var guid = 0;

	function create(mat){

		var name = mat && mat.name;

		// tranform other material types to shader material
		if( ! mat.shader ){
			if( mat instanceof THREE.MeshPhongMaterial){
				var shader = ShaderAsset['buildin-phong'].getInstance();
				var newMat = new THREE.ShaderMaterial;
				bindShader(newMat, shader);
			}
			else if( mat instanceof THREE.MeshLambertMaterial){
				var shader = ShaderAsset['buildin-lambert'].getInstance();
				var newMat = new THREE.ShaderMaterial;
				bindShader(newMat, shader);
			}
			else if( mat instanceof THREE.MeshBasicMaterial){
				var shader = ShaderAsset['buildin-basic'].getInstance();
				var newMat = new THREE.ShaderMaterial;
				bindShader(newMat, shader);
			}
			else if(mat instanceof THREE.ShaderMaterial){
				// create a shader asset;
				var shaderAsset = ShaderAsset.create(new ShaderAsset.Shader({
					uniforms : mat.uniforms,
					fragmentShader : mat.fragmentShader,
					vertexShader : mat.vertexShader
				}))
				bindShader(mat, shaderAsset.data);
			}
		}

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
			export : function(){
				return toJSON( this.data );
			},
			getInstance : function(){
				// return material directly
				return this.data;
			},
			getCopy : function(){
				return getCopy( this.data );
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
	function read(m){


		return material;
	}

	function bindShader(material, shader){

		// get a shader copy
		shader = ShaderAsset.getInstance(shader);

		// also save these for three.js		
		material.uniforms = shader.uniforms;
		material.fragmentShader = shader.fragmentShader;
		material.vertexShader = shader.vertexShader;
	}

	function toJSON( material ){

		var json = {
			name : material.name,
			shader : this.shader.host.getPath()
		}
		
		return json;
	}

	function getCopy( mat ){

		var mat = new THREE.ShaderMaterial();

		return clonedMaterial;
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
		}

		return {
			'Material Asset' : {
				type : 'layer',
				sub : props
			}
		}
	}

	exports.create = create;
	// static functions
	exports.export = toJSON;

	exports.bindShader = bindShader;

	exports.getCopy = getCopy;
})
//========================
// Shader.js
//
// Basic Shader Asset
//
// Shader Asset is part of Material Asset
//========================
define(function(require, exports, module){

	var guid = 0;

	// extend an shader object
	Shader = function(json){

		this.uniforms = json.uniforms;

		this.vertexShader = parseShaderString(json.vertexShader);

		this.fragmentShader = parseShaderString(json.fragmentShader);
	}

	Shader.prototype.clone = function(){
		var clonedUniform = {};
		var self = this;
		// not clone the textures;
		_.each(this.uniforms, function(u, name){

			clonedUniform[name] = {
				type : u.type,
				value : self.cloneValue( u.value )
			}
		})
		return new Shader({
			uniforms : clonedUniform,
			fragmentShader : this.fragmentShader,
			vertexShader : this.vertexShader
		})
	}
	Shader.prototype.cloneValue = function(v){
		var self = this;
		if( _.isArray(v) ){
			var clonedArray = [];
			_.each(v, function(item, idx){
				clonedArray[idx] = self.cloneValue(item);
			})
			return clonedArray
		}
		else if (v instanceof THREE.Color ||
			 v instanceof THREE.Vector2 ||
			 v instanceof THREE.Vector3 ||
			 v instanceof THREE.Vector4 ||
			 v instanceof THREE.Matrix4){
			return v.clone();
		}
		return v;
	}

	function create(shader){

		var name = shader && shader.name;
		
		var ret = {

			type : 'shader',

			name : name || 'Shader_' + guid++,

			data : shader || null,

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
			export : function(){
				return toJSON( this.data );
			},
			getInstance : function(){
				return getInstance(this.data);
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
				else{
					// specially for build in shaders
					return this.name;
				}
			}
		}

		shader && (shader.host = ret);

		return ret;
	}

	function parseShaders(vertexShader, fragmentShader){

	}

	function parseShaderString(shaderString){

		return shaderString.replace(/{{(.*?)}}/, replaceShaderChunk);

	}

	function parseUniforms(shaderString){
		var uniforms = {};

		var uniformDefines = shaderString.match(/uniform\s*\S*\s*\S*\s*;/);
		_.each(uniformDefines, function(str){
			var parts = str.split(' ');
			var type = trim(parts[1]);
			var name = trim(parts[2]);

			unfiroms[name] = {
				type : typeLookup[type]
			}
		})
		return uniforms;
	}

	var typeLookup = {
		'float' : 'f',
		'vector2' : 'v2',
		'vector3' : 'v3',
		'vector4' : 'v4',
		'mat4' : 'm4v',
	}

	function replaceShaderChunk(matchStr, chunkName, offset, string){
		// todo  give a shader chunk query path
		// not only in ShaderChunk
		return THREE.ShaderChunk[ chunkName ];
	}

	function trim(str){
		return str.replace(/(^\s*)|(\s*$)/g, "");  
	}

	function read(str, textureScope){

		var uniforms = {};
		//https://github.com/mrdoob/three.js/wiki/Uniforms-types
		_.each( str.uniforms, function(uniform, key){

			var value;
			switch( uniform.type){
				case 'f':
				case 'i':
					value = uniform.value;
					break;
				case 'fv':
				case 'fv1':
				case 'iv':
				case 'iv1':
					value = unifom.value;
					break;
				case 'v2':
					value = new THREE.Vector2();
					value.set.apply(value, uniform.value);
					break;
				case 'v2v':
					value = [];
					_.each(uniform.value, function(item){
						var v = new THREE.Vector2();
						v.set.apply(v, item.value);
						value.push(v);
					});
					break;
				case 'v3' :
					value = new THREE.Vector3();
					value.set.apply(value, uniform.value);
					break;
				case 'v3v':
					value = [];
					_.each(uniform.value, function(item){
						var v = new THREE.Vector3();
						v.set.apply(v, item.value);
						value.push(v);
					});
					break;
				case 'v4':
					value = new THREE.Vector4();
					value.set.apply(value, uniform.value);
					break;
				case 'v4v':
					value = [];
					_.each(uniform.value, function(item){
						var v = new THREE.Vector4();
						v.set.apply(v, item.value);
						value.push(v);
					});
					break;
				case 'm3':
					value = new THREE.Matrix3();
					value.set.apply(value, uniform.value);
					break;
				case 'm4':
					value = new THREE.Matrix4();
					value.set.apply(value, uniform.value);
					break;
				case 'm4v':
					value = [];	//mainly for shadowMatrix
					break
				case 't':
					value = textureScope( uniform.value );
					break;
				case 'tv':
					var value = [];
					_.each(uniform.value, function(item){
						value.push( textureScope(item) );
					});
					break;
				case 'c':
					value = new THREE.Color( uniform.value );
					break
				default:
					value = 0;
			}

			unfiorms[key] = {
				type : uniform.type,
				value : value
			}
		} )

		var shader = new Shader({
			uniforms : uniforms,
			vertexShader : str.vertexShader,
			fragmentShader : str.fragmentShader
		});
		shader.name = str.name;

		return shader;
	}

	function toJSON( shader ){

		var json = {};
		json.name = shader.name;

		json.uniforms = {};

		_.each( shader.uniforms, function(uniform, key){
			var value;
			switch( uniform.type ){
				case 'f':
				case 'i':
					value = uniform.value;
					break;
				case 'fv':
				case 'fv1':
				case 'iv':
				case 'iv1':
					value = unifom.value;
					break;
				case 'v2':
					value = [uniform.value.x, uniform.value.y];
					break;
				case 'v2v':
					var value = [];
					_.each(uniform.value, function(item){
						value.push([item.x, item.y]);
					})
					break;
				case 'v3v':
					var value = [];
					_.each(uniform.value, function(item){
						value.push([item.x, item.y, item.z]);
					})
					break;
				case 'v4v':
					var value = [];
					_.each(uniform.value, function(item){
						value.push([item.x, item.y, item.z, item.w]);
					})
					break;
				case 'v3' :
					value = [uniform.value.x, uniform.value.y, uniform.value.z];
					break;
				case 'v4':
					value = [uniform.value.x, uniform.value.y, uniform.value.z, uniform.value.w];
					break;
				case 'm3':
					value  = uniform.value.flattenToArray();
					break;
				case 'm4':
					value = unfiorm.value.flattenToArray();
					break;
				//todo
				case 'm4v':
					value = [];
					break;
				case 't':
					value = uniform.value.host.getPath();
					break;
				case 'tv':
					var value = [];
					_.each(uniform.value, function(item){
						value.push( item.host.getPath() );
					});
					break;
				case 'c':
					value = uniform.value.getHex();
					break;
				default:
					value = 0;	//and so on.............
			}

			json.uniforms[key] = {
				type : uniform.type,
				value : value
			}
		} )

		json['vertexShader'] = shader.vertexShader;
		json['fragmentShader'] = shader.fragmentShader;
		
		return json;
	}

	function getInstance( shader ){

		var clonedShader = shader.clone();
		// have the same host
		clonedShader.host = shader.host;

		return clonedShader;
	}

	function getCopy( shader ){

		var clonedShader = shader.clone();

		_.each(clonedShader.uniforms, function(item, key){

			if( item.type == 't' ){

				if(item.value){	

					item.value = item.value.host.getCopy();
					item.value.needsUpdate = true;
				}
			}
			if( item.type == 'tv'){
				if(item.value){
					_.each(item.value, function(t, idx){
						item.value[idx] = t.host.getCopy();
						item.value[idx].needsUpdate = true;
					})
				}
			}
		})

		return clonedShader;
	}

	exports.create = create;
	// static functions
	exports.export = toJSON;
	exports.getInstance = getInstance;
	exports.getCopy = getCopy;

	// shader constructor
	exports.Shader = Shader;


	// some build in shader
	var basicShader = new Shader( THREE.ShaderLib.basic);
	basicShader.name = 'buildin-basic';
	exports['buildin-basic'] = exports.create( basicShader );
	var phongShader = new Shader( THREE.ShaderLib.phong );
	phongShader.name = 'buildin-phong';
	exports['buildin-phong'] = exports.create( phongShader );
	var lambertShader = new Shader( THREE.ShaderLib.lambert);
	lambertShader.name = 'buildin-lambert';
	
	exports['buildin-lambert'] = exports.create( lambertShader );
})
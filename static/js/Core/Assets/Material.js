//========================
// Material.js
//
// Basic Material Asset
// Save an material instance, which can be imported and exported as a json format asset
// file extension, material
//========================
define(function(require, exports, module){

	var guid = 0;

	function create(mat){

		var name = mat && mat.name;
		
		return {

			type : 'material',

			name : name || 'Material_' + guid++,

			data : mat || null,

			rawdata : '',
			// textureScope is a function to query a texture
			import : function(json, textureScope){
				this.data = read(json, textureScope);
				this.rawdata = json;

				if( json.name ){
					this.name = json.name;
				}

				return this.data;
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
			}
		}
	}

	function read(m, textureScope){

		if( material ){

			return material;
		}

		if( m.type == 'basic'){

			material = new THREE.MeshBasicMaterial(  );

		}
		else if(m.type == 'lambert'){

			material = new THREE.MeshLambertMaterial(  );

			_.extend(material, {
				ambient : new THREE.Color(m.ambient),
				emissive : new THREE.Color(m.emissive)
			})
		}
		else if(m.type == 'phong'){

			material = new THREE.MeshPhongMaterial(  );

			_.extend(material, {
				amibent : new THREE.Color( m.ambient ),
				emissive : new THREE.Color( m.emissive ),

				specular : m.specular,
				shininess : m.shininess,
				meta : m.metal,
				perPixel : m.perPixel
			})
		}
		else if(m.type == 'shader'){

			material = new THREE.ShaderMaterial( {
				
				vertexShader : m.vertexShader,

				fragmentShader : m.fragmentShader
			});

			var uniforms = {};
			_.each( m.uniforms, function(uniform, key){

				var value;
				switch( uniform.type){
					case 'f':
						value = uniform.value;
						break;
					case 'v2':
						value = new THREE.Vector2(uniform.value.x, uniform.value.y);
						break;
					case 'v3' :
						value = new THREE.Vector3(uniform.value.x, uniform.value.y, uniform.value.z);
						break;
					case 'v4':
						value = new THREE.Vector4(uniform.value.x, uniform.value.y, uniform.value.z, uniform.value.w);
						break;
					case 't':
						value = textureScope( uniform.value );
						break;
					case 'c':
						value = new THREE.Color( uniform.value );
						break
					default:
						value = 0;	//and so on.............
				}

				unfiorms[key] = {
					type : uniform.type,
					value : value
				}
			} )

			material.uniforms = uniforms;
		}

		if( m.type != 'shader'){

			_.extend(material, {
				name : m.name,

				map : textureScope(m.map),
				lightMap : textureScope(m.lightMap),
				specularMap : textureScope(m.specularMap),
				envMap : textureScope(m.envMap),

				color : new THREE.Color( m.color ),

				opacity : m.opacity,
				transparent : m.transparent,
				reflectivity : m.reflectivity,
				refractionRatio : m.refractionRatio,
				shading : m.shading,
				wireframe : m.wireframe
			});

		}

		return material;
	}

	function toJSON( material ){

		var json = {};
		json.name = material.name;

		if( material instanceof THREE.ShaderMaterial ){

			json.uniforms = [];

			_.each( material.uniforms, function(uniform, key){
				var value;
				switch( uniform.type ){
					case 'f':
						value = uniform.value;
						break;
					case 'v2':
						value = [uniform.value.x, uniform.value.y];
						break;
					case 'v3' :
						value = [uniform.value.x, uniform.value.y, uniform.value.z];
						break;
					case 'v4':
						value = [uniform.value.x, uniform.value.y, uniform.value.z, uniform.value.w];
						break;
					case 't':
						value = textureUriBase + uniform.value.name;
						break;
					case 'c':
						value = uniform.value.getHex();
						break
					default:
						value = 0;	//and so on.............
				}

				json.uniforms[key] = {
					type : uniform.type,
					value : value
				}
			} )

			json['vertexShader'] = material.vertexShader;
			json['fragmentShader'] = material.fragmentShader;
			json['type'] = 'shader';
		}
		else{
			if( material.map && ! material.map.__system__){

				json['map'] = textureUriBase + material.map.name;
			}
			if( material.lightMap ){

				json['lightMap'] = textureUriBase + material.lightMap.name;
			}
			if( material.specularMap ){

				json['specularMap'] = textureUriBase + material.specularMap.name;
			}
			if( material.envMap ){

				json['envMap'] = textureUriBase + material.envMap.name;
			}

			_.extend( json, {
				'opacity' : material.opacity,
				'transparent' : material.transparent,
				'color' : material.color.getHex(),
				'combine' :  material.combine,
				'reflectivity' : material.reflectivity,
				'refractionRatio' : material.refractionRatio,
				'shading' : material.shading,
				'wireframe' : material.wireframe
			})

			if( material instanceof THREE.MeshBasicMaterial ){
				json['type'] = 'basic';
			}
			else if( material instanceof THREE.MeshLambertMaterial ){

				_.extend(json, {
					'type' : 'lambert',
					'ambient' : material.ambient.getHex(),
					'emissive' : material.emissive.getHex()
				})
			}
			else if( material instanceof THREE.MeshPhongMaterial ){

				_.extend(json, {

					'type' : 'phong',
					'ambient' : material.ambient.getHex(),
					'emissive' : material.emissive.getHex(),

					'specular' : material.specular,
					'shininess' : material.shininess,
					'metal' : material.metal,
					'perPixel' : material.perPixel,

				})
				if( material.bumpMap ){
					_.extend( json, {

						'bumpMap' : textureUriBase + material.bumpMap.name,
						'bumpScale' : material.bumpScale
					})
				}
				if( material.normalMap ){

					_.extend( json, {

						'normalMap' : textureUriBase + material.normalMap.name,
						'normalScale' : material.normalScale
					})
				}
			}
		}
		return json;
	}

	function getCopy( mat ){

		var clonedMaterial = mat.clone();

		if( clonedMaterial instanceof THREE.ShaderMaterial ){

			_.each(clonedMaterial.uniforms, function(item, key){

				if( item.type == 't' ){

					if(item.value){	

						item.value = item.value.clone();
						item.value.needsUpdate = true;
					}
				}
			})
		}
		else {
			if(clonedMaterial.map){

				clonedMaterial.map = clonedMaterial.map.clone();
				clonedMaterial.map.needsUpdate = true;
			}
			if( clonedMaterial.lightMap){

				clonedMaterial.lightMap = clonedMaterial.lightMap.clone();
				clonedMaterial.map.needsUpdate = true;
			}
			if( clonedMaterial.specularMap ){

				clonedMaterial.specularMap = clonedMaterial.specularMap.clone();
				clonedMaterial.map.needsUpdate = true;
			}
			if( clonedMaterial.envMap ){

				clonedMaterial.envMap = clonedMaterial.envMap.clone();
				clonedMaterial.map.needsUpdate = true;
			}
		}

		return clonedMaterial;
	}

	exports.create = create;
	// static functions
	exports.export = toJSON;

	exports.getCopy = getCopy;
})
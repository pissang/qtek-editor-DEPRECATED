//====================
// runtime.js
//====================
define(function(require, exports){

	var textureUriBase = '/project/texture/',
		materialUriBase = '/project/material/',
		geometryUriBase = '/project/geometry/';
	

	var cache;

	function parse( blob, callback, onprogress ){

		cache = {
			images : {},
			textures : {},
			materials : {},
			geometries : {}
		};

		// based on zip.js
		zip.createReader(new zip.BlobReader( blob ), function(reader){
			
			reader.getEntries( function(entries){
				
				// streamly read textures and geometries
				// browser will crash if we create too much webworkers concurrently
				// 同时存在maxNumber个WebWorker

				var index = 0,
					maxNumber = entries.length > 15 ? 15 : entries.length;
					working = 0,
					extracted = 0;
				
				for( var i = 0; i < maxNumber; i++){

					readImageAndGeo( next );

					index++;
					working++;
				}

				function next(){

					working--;

					extracted++;

					onprogress && onprogress(extracted, entries.length);

					if( index == entries.length-1){

						if( working == 0){

							readSceneFile();
							return;
						}
					}
					else if( working <= maxNumber){

						index++;
						working++;

						readImageAndGeo( next );
					}
				}

				function readImageAndGeo( next ){
					var entry = entries[index];
					var fileName = entry.filename,
						fileSplitted = fileName.split('.'),
						ext = fileSplitted.pop(),
						name = fileSplitted.join('.'),
						mimetype = zip.getMimeType(fileName);

					//image file
					if( mimetype.match('image/.*') ){

						entry.getData(new zip.Data64URIWriter( mimetype ), function(data){
						
							var img = new Image();
							img.src = data;

							cache.images[ fileName ] = img;

							next();
						})	//end get data

					}
					// geometry file
					else if( ext == 'geo'){

						entry.getData( new zip.TextWriter(), function(data){

							var loader = new THREE.JSONLoader();
							var json = JSON.parse(data);
							
							loader.createModel(json, function(geo){

								geo.computeBoundingSphere();

								cache.geometries[ geometryUriBase + name] = geo;
								
								next()
							}, function(){
								
							})
						})
					}
					else{
						next();
					}
				}


				// add scene

				function readSceneFile(){

					_.each( entries, function(entry){

						if( entry.filename == 'scene.js'){

							entry.getData( new zip.TextWriter, function(data){

								var json = JSON.parse( data );
								_.each( json.texture, function(item){

									var texture = createTexture( item.data);

									cache.textures[textureUriBase + texture.name] = texture;

								} );

								_.each( json.material, function(item){

									var material = createMaterial( item.data );
									cache.materials[materialUriBase + material.name] = material;

								} );

								var sceneNodes = createNode( json.scene );

								var scene,
									cameras = [],
									activeCamera,
									lights = [];
								_.each(sceneNodes, function(node){

									if( node.name == json.activeCamera ){
										activeCamera = node;
									}else if( node instanceof THREE.Camera){
										cameras.push( node );
									}else if( node instanceof THREE.Light){
										lights.push( node );
									}
									else if( node.name == 'scene'){
										scene = node;
									}
								})

								callback && callback( {
									scene : scene,
									nodes : sceneNodes,
									cameras : cameras,
									lights : lights,
									geometries : cache.geometries,
									textures : cache.textures,
									materials : cache.materials,
									activeCamera : activeCamera
								} )

							} )
						}
					})
				}	//end read material file

			} )	//end getEntries

			reader.close();
		})

	}

	function createTexture(t){

		var texture = new THREE.Texture( );

		_.extend(texture, {
			name : t.name,
			wrapS : t.wrapS,
			wrapT : t.wrapT,
			magFilter : t.magFilter,
			minFilter : t.minFilter,
			anisotropy : t.anisotropy,
			format : t.format,
			type : t.type,
			image : cache.images[t.image],
			offset : new THREE.Vector2( t.offset[0], t.offset[1] ),
			repeat : new THREE.Vector2( t.repeat[1], t.repeat[1] )
		})

		texture.needsUpdate = true

		return texture;
	}

	function createMaterial(m){
		
		var material = cache.materials[ m.name ];
		
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
						value = cache.textures[ uniform.value ]
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

				map : cache.textures[m.map],
				lightMap : cache.textures[m.lightMap],
				specularMap : cache.textures[m.specularMap],
				envMap : cache.textures[m.envMap],

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

	function createNode( json ){

		var nodes = {};

		_.each( json, function(n){

			var node = new nodeTypeMap[ n.type ];

			node.name = n.name;
			node.parent = n.parent;
			
			var props = _.union( nodePropsMap[ n.type ], nodePropsMap['node'] );

			_.each( props, function(propName){

				var prop = n[ propName ];

				if( ! prop){
					return;
				}
				if( _.isNumber(prop) ){

					node[propName] = prop
				}
				else if( _.isString( prop ) ){

					if( prop.indexOf('/project/material/') == 0 ){

						node[propName] = cache.materials[prop] || new THREE.MeshBasicMaterial( );;
					}
					else if( prop.indexOf('/project/geometry/') == 0){

						node[propName] = cache.geometries[prop] || new THREE.Geometry();
					}
				}
				else if( prop.length == 2){

					node[propName] = new THREE.Vector2( prop[0], prop[1]);
				}
				else if( prop.length == 3){

					node[propName] = new THREE.Vector3( prop[0], prop[1], prop[2]);
				}
				else if( prop.length == 4){

					node[propName] = new THREE>Vector4( prop[0], prop[1], prop[2], prop[3]);
				}
			} );

			if( node instanceof THREE.Light ){

				node['color'] = new THREE.Color( n['color'] );
			}

			nodes[ n.name ] = node;
		})

		//reconstruct the tree
		_.each( nodes, function(node, name){

			if( node.parent){
				var parent = nodes[ node.parent ];
				node.parent = parent;
				parent.add( node );
			}
		})

		return nodes;
	}
	var nodeTypeMap = {
		'mesh' : THREE.Mesh,
		// lights
		'directionalLight' : THREE.DirectionalLight,
		'pointLight' : THREE.PointLight,
		'ambientLight' : THREE.AmbientLight,
		'spotLight' : THREE.SpotLight,
		// cameras
		'perspectiveCamera' : THREE.PerspectiveCamera,
		'orthographicCamera' : THREE.OrthographicCamera,
		//scene
		'scene' : THREE.Scene,
		// base
		'node' : THREE.Object3D
	}

	var nodePropsMap = {
		'mesh' : [ 'geometry', 'material' ],
		'directionalLight' : [ 'color', 'intensity' ],
		'pointLight' : [ 'color', 'intensity', 'distance' ],
		'ambientLight' : [ 'color' ],
		'spotLight' : [ 'intensity', 'distance', 'angle', 'exponent' ],
		'perspectiveCamera' : [ 'fov', 'aspect', 'near', 'far' ],
		'orthographicCamera' : [ 'left', 'right', 'top', 'bottom', 'near', 'far'],
		'scene' : [],
		'node' : [ 'position', 'rotation', 'scale'  ]
	}

	return {
		parse : parse
	}
})
//========================
// Prefeb.js
//
// Node Prefeb Asset
// Save a copy of node instance, it will be packed as a zip file when storing on the disk.
// file extension, prefeb
//========================
define(function(require, exports, module){

	var Geometry = require('./Geometry');
	var Material = require('./Material');
	var Texture = require('./Texture');
	var TextureCube = require('./TextureCube');
	var Util = require('./Util');

	var guid = 0;

	function create(node){

		var name = node && node.name;

		var ret = {

			type : 'prefab',

			name : name || 'Mesh_' + guid++,

			data : node || null,

			rawdata : '',

			host : null,

			import : function(json, materialScope, geometryScope){
				this.data = read( json, materialScope, geometryScope );
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
			}
		}

		node && (node.host = ret);
		return ret;
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
		'node' : THREE.Object3D //node 最后被遍历到
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
		'node' : [ 'name', 'position', 'rotation', 'scale' ]
	}
	
	function read(json, materialScope, geometryScope ){
		
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
				else if( propName == 'material' ){
					node['material'] = materialScope( prop );
				}
				else if( propName == 'geometry' ){
					node['geometry'] = geometryScope( prop );
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

	function toJSON( _node ){

		var items = {};
		// flattening the scene
		_node.traverse( function( node ){

			if(node.__helper__){
				return;
			}
			if( !node.name){
				return;
			}

			var  item = {};

			item[ 'name' ] = node.name;

			if( node.parent ){

				item['parent'] = node.parent.name;
			}

			items[node.name] = item;

			// export properties
			_.each( nodeTypeMap, function(Constructor, type){

				if( node instanceof Constructor){
					if( ! item['type']){

						item['type'] = type;
					}

					var props = nodePropsMap[type];

					_.each( props, function(propName){

						var prop = node[propName];

						if( prop instanceof THREE.Vector2){

							item[propName] = [prop.x, prop.y];
						}
						else if( prop instanceof THREE.Vector3){

							item[propName] = [prop.x, prop.y, prop.z];
						}
						else if( prop instanceof THREE.Vector4){

							item[propName] = [prop.x, prop.y, prop.z, prop.w];
						}
						else if( prop instanceof THREE.Color ){

							item[propName] = prop.getHex();
						}
						else if( _.isNumber(prop) || _.isString(prop) ){

							item[propName] = prop;
						}
						else if( prop instanceof THREE.Material ){

							item[propName] = prop.host.getPath();
						}
						else if( prop instanceof THREE.Geometry){

							item[propName] = prop.host.getPath();
						}
					})
				}
			} )

		} );

		return items;
	}

	function getInstance( root ){

		var rootCopied = Util.deepCloneNode(root);

		// have the same host
		rootCopied.host = root.host;

		rootCopied.traverse( function(nodeCopied){
			var name = nodeCopied.name,
				node = root.getChildByName(name, true);
			if(nodeCopied == rootCopied){
				node = root;
			}
			if( ! node.__referencecount__){
				node.__referencecount__ = 0;
			}
			nodeCopied.name = name + '_' + node.__referencecount__++
		})

		return rootCopied;
	}

	function getCopy( root ){

		var nodes = {};

		var rootCopied = Util.deepCloneNode(root);

		rootCopied.traverse( function(nodeCopied){
			
			if( ! nodeCopied.geometry){
				return;
			}

			nodeCopied.geometry = shallowCloneGeo(nodeCopied.geometry);
			//manually compute bounding sphere
			nodeCopied.geometry.computeBoundingSphere();
			nodeCopied.material = shallowCloneMaterial( nodeCopied.material );

		} );

		return rootCopied;
	}

	function getConfig(prefab){
		return {
			'Prefab Asset' : {
				type : 'layer',
				sub : {
					'name' : {
						type : 'input',
						value : prefab.name,
						onchange : function(value){
							prefab.name = value;
							prefab.host.name = value;
							prefab.host.host.setName(value);
						}
					}
				}
			}
		}

	}

	exports.create = create;

	exports.export = toJSON;
	exports.getInstance = getInstance;
	exports.getCopy = getCopy;
})
//=========================
// Collada.js
// import from collada file
//=========================

define(function(require, exports, module){

	var colladaLoader = new THREE.ColladaLoader();
	var GeometryAsset = require('../Geometry'),
		PrefabAsset = require('../Prefab'),
		MaterialAsset = require('../Material'),
		AssetUtil = require('../Util');

	exports.import = function(name, data, folder){

		var textureScope = function(init_from){
			var file = folder.find(init_from);
			if( ! file){
				file = folder.find('textures/'+init_from);
			}
			if( !file){
				// remove the base path and get file name;
				init_from = init_from.split('/').pop();
				file = folder.find(init_from);
			}
			if( ! file){
				file = folder.find('textures/'+init_from);
			}
			if( file){
				return file.data.getInstance();
			}
		}

		colladaLoader.parse(data, function(result){
			
			var root = new THREE.Object3D();
			_.each(result.scene.children, function(child){
				root.add(child);
			})
			root.name = name;
			// get all material instances;
			var materials = {};
			root.traverse(function(_node){
				if(_node.material){
					materials[_node.material.name] = _node.material;
				}
			})

			// create material asset file
			var matFolder = folder.createFolder('materials');
			_.each(materials, function(material, name){
				var matAsset = MaterialAsset.create( material );
				var file = matFolder.createFile(matAsset.name, matAsset);
				
				materials[name] = matAsset.data;
			})
			// the material has to be reseted
			root.traverse(function(_node){
				if(_node.material){
					_node.material = materials[_node.material.name];
				}
			})
			// create prefab asset file
			var prefab = PrefabAsset.create( root );
			var file = folder.createFile( prefab.name, prefab );
		
		}, textureScope);
	}

	exports.importFromFile = function(file, folder, callback){
		var reader = new FileReader();
		reader.onload = function( evt ){

			if(evt.target.readyState == FileReader.DONE){
				
				var name = AssetUtil.parseFileName(file.name).base;

				var domParser = new DOMParser();
				var doc = domParser.parseFromString(evt.target.result, 'application/xml');

				var res = exports.import( name, doc, folder);

				callback && callback(res);
			}
		}

		reader.readAsText( file );
	}

	exports.importFromUrl = function(url, folder, callback){

	}
})
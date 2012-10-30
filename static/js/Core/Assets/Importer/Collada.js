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

		colladaLoader.parse(data, function(result){

			var node = new THREE.Object3D();
			_.each(result.scene.children, function(child){
				node.add(child);
			})
			node.name = name;
			var prefab = PrefabAsset.create( node );
			var file = folder.createFile( prefab.name, prefab );
		})
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
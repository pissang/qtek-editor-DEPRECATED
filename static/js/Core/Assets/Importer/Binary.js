//=======================
// Binary.js
// import from binary file
//=======================

define(function(require, exports, module){

	var binaryLoader = new THREE.BinaryLoader();
	var GeometryAsset = require('../Geometry'),
		PrefabAsset = require('../Prefab'),
		AssetUtil = require('../Util');

	exports.import = function(name, bin, folder){
		var geo;
		binaryLoader.createBinModel(bin, function(_geo){
			geo = _geo;
		}, '', []);

		geo.name = name;
		var node = createSplittedMeshes( geo );
		var prefab = PrefabAsset.create( node );
		var file = folder.createFile(prefab.name, prefab);
	}

	exports.importFromFile = function(file, folder, callback){

		var reader = new FileReader();
		reader.onload = function( evt ){

			if( evt.target.readyState == FileReader.DONE){
				var name = AssetUtil.parseFileName( file.name ).base;
				var res =  exports.import( name, evt.target.result, folder );
				callback && callback(res );
			}
		}
		reader.readAsArrayBuffer( file );
	}

	exports.importFromUrl = function(url, callback){

	}

	function createSplittedMeshes(geo){

		geoList = AssetUtil.splitGeometry( geo );

		var node = new THREE.Object3D();
		node.name = geo.name;

		_.each(geoList, function(subGeo, index){
			
			var mesh = GeometryAsset.getInstance( subGeo );
			node.add(mesh);

		})

		return node;
	}
})
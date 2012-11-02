//=========================
// Json.js
// import from json file
//=========================

define(function(require, exports, module){

	var jsonLoader = new THREE.JSONLoader();
	var GeometryAsset = require('../Geometry'),
		PrefabAsset = require('../Prefab'),
		MaterialAsset = require('../Material'),
		AssetUtil = require('../Util');

	exports.import = function(name, json, folder){

		// create material assets
		var materialList = [];
		var matFolder = folder.createFolder('materials');
		_.each(json.materials, function(mat){
			var material = createMaterial(mat, function(name){
				
				var file = folder.find( name )
				if( ! file ){
					file = folder.find( 'textures/'+name);
				}
				if( file ){
					return file.data.getInstance();
				}
			})
			//create asset;
			var matAsset = MaterialAsset.create( material );
			var file = matFolder.createFile(matAsset.name, matAsset);
			// the material has been tranformed to Shader Material
			// in the MaterialAsset
			materialList.push( matAsset.data );
		})
		if( ! json.buffers ){
			jsonLoader.createModel(json, function(geo){

				geo.name = name;
				var node = createSplittedMeshes(geo, materialList);
				var prefab = PrefabAsset.create( node );
				var file = folder.createFile(prefab.name, prefab);

			})
		}

	}

	exports.importFromFile = function(file, folder, callback){

		var reader = new FileReader();
		reader.onload = function( evt ){

			if( evt.target.readyState == FileReader.DONE){
				
				var name = AssetUtil.parseFileName( file.name ).base;
				
				var res =  exports.import( name, JSON.parse(evt.target.result), folder );
				callback && callback(res );
			}
		}
		reader.readAsText( file );
	}

	exports.importFromUrl = function(url, folder, callback){
		
	}

	function createSplittedMeshes(geo, materialList){

		geoList = AssetUtil.splitGeometry( geo );

		var node = new THREE.Object3D();
		node.name = geo.name;

		_.each(geoList, function(subGeo, index){
			
			var mesh = GeometryAsset.getInstance(subGeo, materialList[index]);
			node.add(mesh);

		})

		return node;
	}

	function createMaterial(m, textureScope){

		if( material ){
			return material;
		}

		function rgb2hex( rgb ) {
			return ( rgb[ 0 ] * 255 << 16 ) + ( rgb[ 1 ] * 255 << 8 ) + rgb[ 2 ] * 255;
		}

		var mtype = "MeshPhongMaterial";
		var mpars = { color: 0xeeeeee, opacity: 1.0, map: null, lightMap: null, normalMap: null, bumpMap: null, wireframe: false };

		// parameters from model file

		if ( m.shading ) {
			var shading = m.shading.toLowerCase();
			if ( shading === "phong" ) mtype = "MeshPhongMaterial";
			else if ( shading === "basic" ) mtype = "MeshBasicMaterial";
		}

		if ( m.blending !== undefined && THREE[ m.blending ] !== undefined ) {
			mpars.blending = THREE[ m.blending ];
		}

		if ( m.transparent !== undefined || m.opacity < 1.0 ) {
			mpars.transparent = m.transparent;
		}

		if ( m.depthTest !== undefined ) {
			mpars.depthTest = m.depthTest;
		}

		if ( m.depthWrite !== undefined ) {
			mpars.depthWrite = m.depthWrite;
		}

		if ( m.visible !== undefined ) {
			mpars.visible = m.visible;
		}

		if ( m.flipSided !== undefined ) {
			mpars.side = THREE.BackSide;
		}

		if ( m.doubleSided !== undefined ) {
			mpars.side = THREE.DoubleSide;
		}

		if ( m.wireframe !== undefined ) {
			mpars.wireframe = m.wireframe;
		}

		if ( m.vertexColors !== undefined ) {
			if ( m.vertexColors === "face" ) {
				mpars.vertexColors = THREE.FaceColors;
			} else if ( m.vertexColors ) {
				mpars.vertexColors = THREE.VertexColors;
			}
		}

		// colors
		if ( m.colorDiffuse ) {
			mpars.color = rgb2hex( m.colorDiffuse );
		} else if ( m.DbgColor ) {
			mpars.color = m.DbgColor;
		}

		if ( m.colorSpecular ) {
			mpars.specular = rgb2hex( m.colorSpecular );
		}

		if ( m.colorAmbient ) {
			mpars.ambient = rgb2hex( m.colorAmbient );
		}

		// modifiers

		if ( m.transparency ) {
			mpars.opacity = m.transparency;
		}

		if ( m.specularCoef ) {
			mpars.shininess = m.specularCoef;
		}

		// textures
		if ( m.mapDiffuse ) {
			mpars['map'] = textureScope(m.mapDiffuse);
		}

		if ( m.mapLight ) {
			mpars['lightMap'] = textureScope(m.mapLight);
		}

		if ( m.mapBump ) {
			mpars['bumpMap'] = textureScope( m.mapBump );
		}

		if ( m.mapNormal ) {
			mpars['normalMap'] = textureScope(m.mapNormal);
		}

		if ( m.mapSpecular ) {
			mpars['specularMap'] = textureScope(m.mapSpecular);
		}

		//

		if ( m.mapBumpScale ) {
			mpars.bumpScale = m.mapBumpScale;
		}

		var material = new THREE[ mtype ]( mpars );
		material.name = m.DbgName;

		return material;
	}
})
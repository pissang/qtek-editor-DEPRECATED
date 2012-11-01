//========================
// Geometry.js
//
// Basic Geometry Asset
// Save an geometry instance, which can be imported and exported as a json format asset
//========================
define(function(require, exports, module){

	// adapter to THREE.JSONLoader and BinaryLoader
	var jsonLoader = new THREE.JSONLoader();
	
	var guid = 0;

	function create( geo ){

		var name = geo && geo.name;

		var ret = {

			type : 'geometry',

			name : name || 'Geometry_' + guid++,

			data : geo || null,

			host : null,

			// import from json
			import : function(json){
				this.data = read(json);

				this.data.host = this;

				if( json.name ){
					this.name = json.name;
				}

				return this.data;
			},
			// export to json
			export : function(){
				return toJSON( this.data );
			},
			// 获取一个Mesh的Instance
			getInstance : function( material ){
				return getInstance( this.data, material );
			},
			getCopy : function(){
				return getCopy( this.data );
			},
			getPath : function(){
				if( this.host){
					return this.host.getPath();
				}
			}
		}

		geo && (geo.host = ret);

		return ret;
	}

	function read(json){
		var ret;
		jsonLoader.createModel(json, function(geo){
			ret = geo;
		})
		return ret;
	}

	function getInstance( geo, material ){

		if( ! material){
			
			material = new THREE.MeshLambertMaterial( {
				wireframe : true,
				color : 0xffffff*Math.random()
			} );
			// 用来判断是否是系统自带材质
			material.__system__ = true;
		}

		// https://github.com/mrdoob/three.js/issues/363
		// https://github.com/mrdoob/three.js/wiki/Updates

		// fucking cache
		// https://github.com/mrdoob/three.js/issues/2073
		// https://github.com/mrdoob/three.js/issues/363
		if( material.map ){
			geo.uvsNeedUpdate = true;
		}
		if( ! geo.__referencecount__ ){
			geo.__referencecount__ = 0;
		}

		var mesh = new THREE.Mesh(geo, material);
		mesh.name = geo.name+'_'+geo.__referencecount__;
		geo.__referencecount__++;

		return mesh;
	}

	function getCopy( geo ){

		var cloneGeo = new THREE.Geometry();

		_.extend(cloneGeo, {
			vertices : geo.vertices,
			faces : geo.faces,
			faceVertexUvs : geo.faceVertexUvs,
			boundingBox : geo.boundingBox
		})

		return cloneGeo;
	}

	//https://github.com/mrdoob/three.js/wiki/JSON-Model-format-3.1
	function toJSON(geo){

		var i, j,
		json = {
			name : geo.name,
			metadata: { 
				formatVersion: 3.1
			},
			scale: 1.000000,
			materials: [],
			vertices: [],
			morphTargets: [],
			morphColors: [],
			normals: [],
			colors: [],
			uvs: [[]],
			faces: []
		};

		for (i = 0; i < geo.vertices.length; i++) {
			json.vertices.push(geo.vertices[i].x);
			json.vertices.push(geo.vertices[i].y);
			json.vertices.push(geo.vertices[i].z);
		}

		for(var i = 0; i < geo.materials.length; i++){
	    	json.materials[i] = materialBaseUri+geo.materials[i].name;
	    }

		var hasFaceUv,
			hasMaterial,
			hasFaceVertexUv,
			isQuad,
			hasFaceNormal,
			hasFaceVertexNormal,
			hasFaceColor,
			hasFaceVertexColor,

			face, nVertices,
			// todo, add multiple uUvLayers support
			nUvLayers,

			bitset;

		if( geo.faceVertexUvs[0].length){
			hasFaceVertexUv = 1;
		}else{
			hasFaceVertexUv = 0;
		}
		if( geo.faceUvs[0].length){
			hasFaceUv = 1;
		}else{
			hasFaceUv = 0;
		}

		for (i = 0; i < geo.faces.length; i++) {

			face = geo.faces[i];

			if( !_.isUndefined(face.materialIndex) ){
				hasMaterial = 1
			}else{
				hasMaterial = 0
			}
			if( face instanceof THREE.Face4 ){
				nVertices = 4;
				isQuad = 1;
			}else{
				nVertices = 3;
				isQuad = 0;
			}
			if( face.normal){
				hasFaceNormal = 1;
			}else{
				hasFaceNormal = 0;
			}
			if( face.vertexNormals.length){
				hasFaceVertexNormal = 1;
			}else{
				hasFaceVertexNormal = 0;
			}
			// if( face.color){
			// 	hasFaceColor = 1;
			// }else{
			// 	hasFaceColor = 0;
			// }
			hasFaceColor = 0;	//不知道怎么判断是否有faceColor

			if( face.vertexColors.length){
				hasFaceVertexColor = 1;
			}else{
				hasFaceVertexColor = 0;
			}

			bitset = isQuad 
					| (hasMaterial<<1)
					| (hasFaceUv<<2)
					| (hasFaceVertexUv<<3)
					| (hasFaceNormal<<4)
					| (hasFaceVertexNormal<<5)
					| (hasFaceColor<<6)
					| (hasFaceVertexColor<<7);

		   	json.faces.push( bitset );


			json.faces.push(face.a);
			json.faces.push(face.b);
			json.faces.push(face.c);

			if ( isQuad) {
				json.faces.push(face.d);
			}
			if( hasMaterial){

				json.faces.push( face.materialIndex );
			}
			if( hasFaceUv ){

				json.uvs[0].push(geo.faceUvs[0][i].u);
				json.uvs[0].push(geo.faceUvs[0][i].v);

				json.faces.push( json.uvs[0].length/2-1);
			}
			if( hasFaceVertexUv ){

				for( j = 0; j < nVertices; j++){
					
					json.uvs[0].push(geo.faceVertexUvs[0][i][j].u);
					json.uvs[0].push(geo.faceVertexUvs[0][i][j].v);

					json.faces.push( json.uvs[0].length/2-1);
				}
			}
			if( hasFaceNormal){

				json.normals.push(face.normal.x);
				json.normals.push(face.normal.y);
				json.normals.push(face.normal.z);

				json.faces.push( json.normals.length/3 -1 )
			}
			if( hasFaceVertexNormal ){

				for( j = 0; j < nVertices; j++){

					json.normals.push( face.vertexNormals[j].x)
					json.normals.push( face.vertexNormals[j].y)
					json.normals.push( face.vertexNormals[j].z)

					json.faces.push( json.normals.length/3-1 );
				}
			}
			if( hasFaceColor ){

				json.colors.push( face.color.getHex() );
				json.faces.push( json.colors.length-1 );
			}
			if( hasFaceVertexColor ){
				
				for( j = 0; j < nVertices; j++){

					json.colors.push( face.vertexColors[j].getHex() );
					json.faces.push( json.colors.length-1 );
				}
			}
		}

		return json;
	}

	exports.create = create;

	// static functions
	exports.export = toJSON;

	exports.getInstance = getInstance;

	exports.getCopy = getCopy;
})
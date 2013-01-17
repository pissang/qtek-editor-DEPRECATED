//=============
// Util.js
// Assets Util
//=============
define(function(require, exports, module){
	
	//
	//分割有多个material的geometry，使得每个mesh都只有一个单独的material
	//为了清晰，不适用three.js的face material
	//todo morphTarget, morphColor, morphNormals, skinWeights?
	//
	exports.splitGeometry = function(geo){

		var faces = geo.faces,
			uvs = geo.faceVertexUvs[0],	//只支持一个uv？
			vertices = geo.vertices,

			face, materialIndex,
			v1, v2, v3, v4,

			hashMap = [], item;

		for(var i = 0; i < faces.length; i++){
			
			face = faces[i];

			materialIndex = face.materialIndex;
			if( _.isUndefined( materialIndex ) ){
				materialIndex = 0;
			}

			if( ! hashMap[materialIndex] ){
				hashMap[materialIndex] = {
					'faces' : [],
					'vertices' : [],
					'uvs' : []
				}
			}
			item = hashMap[materialIndex];
			item.faces.push(face);
			if( uvs[i] ){
				item.uvs.push(uvs[i]);
			} 

			v1 = vertices[ face.a ];
			v2 = vertices[ face.b ];
			v3 = vertices[ face.c ];
			
			v1 = processVertex(v1, item, materialIndex);
			face.a = v1.__newindex__;
			v2 = processVertex(v2, item, materialIndex);
			face.b = v2.__newindex__;
			v3 = processVertex(v3, item, materialIndex);
			face.c = v3.__newindex__;

			if( face instanceof THREE.Face4){
				v4 = vertices[ face.d ];
				v4 = processVertex(v4, item, materialIndex);
				face.d = v4.__newindex__;
			}
				
		}

		function processVertex(v, item, materialIndex){
			if( typeof(v.__newindex__) !== 'undefined' ){
				item.vertices.push(v);
				// save the index of the new vertex array
				v.__newindex__ = item.vertices.length - 1;
			}
			if( typeof(v.__materialindex__) !== 'undefined' ){
				v.__materialindex__ = materialIndex;
			}
			else if( v.__materialindex__ != materialIndex){
				v = v.clone();
				item.vertices.push(v);
				v.__newindex__ = item.vertices.length - 1;
				v.__materialindex__ = materialIndex;
			}
			return v;
		}

		var subGeo, subGeoList = [];

		for(var i = 0; i < hashMap.length; i++){
			subGeo = new THREE.Geometry();
			subGeo.vertices = hashMap[i].vertices;
			subGeo.faces = hashMap[i].faces;
			subGeo.faceVertexUvs = [ hashMap[i].uvs ];

			subGeo.name = geo.name+'_sub_'+i;

			subGeoList.push(subGeo);
		}
		// clear
		for( var i = 0; i < hashMap.length; i++){
			for(var v=0; v < hashMap[i].vertices.length; v++){
				delete hashMap[i].vertices[v].__newindex__;
				delete hashMap[i].vertices[v].__materialindex__;
			}
		}
		// index 0 is the faces has no materialindex
		return subGeoList;
	}

	//
	// 计算整个节点的boundingbox
	//
	exports.computeBoundingBox = function(_node){

		function computeBoundingBox(node){

			var bbs = [];
			if( node.geometry ){

				if( ! node.geometry.boundingBox){

					node.geometry.computeBoundingBox();
				}
				bbs.push(node.geometry.boundingBox);
			}

			_.each(node.children, function(item, key){

				var bb = computeBoundingBox(item);
				bbs.push(bb);
			})
			var min = new THREE.Vector3(100000, 100000, 100000);
			var max = new THREE.Vector3(-100000, -100000, -100000);
			
			_.each(bbs, function(item, key){

				if(item.max.x > max.x){
					max.x = item.max.x;
				}
				if(item.max.y > max.y){
					max.y = item.max.y;
				}
				if(item.max.z > max.z){
					max.z = item.max.z;
				}
				if(item.min.x < min.x){
					min.x = item.min.x;
				}
				if(item.min.y < min.y){
					min.y = item.min.y;
				}
				if(item.min.z < min.z){
					min.z = item.min.z;
				}
			})

			return {min : min, max : max};
		}

		return computeBoundingBox(_node);
	}

	exports.deepCloneNode = function(root){
		var rootCopy = root.clone();

		_.each(root.children, function(node){
			rootCopy.add( exports.deepCloneNode(node) );	

		})

		return rootCopy;

	}

	exports.parseFileName = function(fileName){
		var fileSplited = fileName.split('.'),
			ext = fileSplited.pop(),
			base = fileSplited.join('.');

		return {
			ext : ext,
			base : base
		}
	}

})
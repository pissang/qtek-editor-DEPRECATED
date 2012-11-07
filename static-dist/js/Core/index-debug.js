//====================
// Hub.js
// 整个程序的消息收发中介
// Signal.js?
//====================
define("Core/Hub-debug", [], function(require, exports, module){

	var hub = null;
	
	function getInstance(){
		
		if( ! hub){

			hub = {};
			_.extend(hub, Backbone.Events);
		}

		return hub;
	}

	return {
		getInstance : getInstance
	}
})

//==========================
//svg 操作的简单类
//===========================
define("Core/svg-debug", [], function(require, exports, module){

	var xmlns = 'http://www.w3.org/2000/svg';

	exports.create = function(tag){

		return document.createElementNS(xmlns, tag);
	};

	exports.attr = function(elem, attr, value){
		var attrs = attr;
		if(_.isString(attr)){
			attrs = {};
			attrs[attr] = value;
		}
		_.each(attrs, function(value, attr){

			elem.setAttributeNS(null, attr, value);
		})
	}
})

//=================================
// MouseEventDispatcher.js
// 鼠标对场景操作的事件获取和分发中心
//================================

define("Core/MouseEventDispatcher-debug", ["./Assets/Util-debug"], function(require, exports){

	var AssetUtil = require('./Assets/Util-debug');

	function create( scene, camera, renderer, gpupicking){

		var	gpupicking = _.isUndefined( gpupicking ) ? true : gpupicking,

			width = renderer.domElement.width,
			height = renderer.domElement.height,

			pickingObjects = [],
			picking,
			
			//for gpu picking
			pickingRt,

			//for ray picking
			projector = new THREE.Projector();


		// todo rendertarget的大小是否需要和draw buffer一样？
		pickingRt = new THREE.WebGLRenderTarget( width, height );
		pickingRt.generateMipmaps = false;


		var picking = null,
			mouseOver = null,
			$el = $(renderer.domElement);
		
		// register all events listener of the canvas
		$el.mousedown(function(e){
			var x = e.offsetX,
				y = e.offsetY,
				prop = {
					x : x,
					y : y
				}

			var obj = _pick( x, y );
			
			if( ! gpupicking){
				
				if( obj ){	
					var res = obj;
					obj = res.object;
					prop.pickinfo = res;
				}
			}

			if( obj ){
				MouseEvent.throw('mousedown', obj, prop)
			}
		})
		.mousemove(function(e){

			var x = e.offsetX,
				y = e.offsetY,
				prop = {
					x : x,
					y : y
				}

			var obj = _pick( x, y);
			
			if( ! gpupicking){

				if( obj ){	
					var res = obj;
					obj = res.object;
					prop.pickinfo = res;
				}
			}

			if( obj ){

				MouseEvent.throw('mousemove', obj, prop)
				if( obj != mouseOver){
					// mouse first on this object
					MouseEvent.throw('mouseover', obj, prop)
					if( mouseOver ){
						MouseEvent.throw('mouseout', mouseOver, prop)
					}
					mouseOver = obj;
				}
			}
			else if( mouseOver ){
				// move out the object
				MouseEvent.throw('mouseout', mouseOver, prop);
				mouseOver = null;
			}
		})
		.mouseup(function(e){

			var x = e.offsetX,
				y = e.offsetY,
				prop = {
					x : x,
					y : y
				}

			var obj = _pick( x, y);

			if( ! gpupicking){
				
				if( obj ){	
					var res = obj;
					obj = res.object;
					prop.pickinfo = res;
				}
			}

			MouseEvent.throw('mouseup', obj, prop)
		});

		// 基于GPU的拾取
		function _pick(x, y){

			var object;
			if( gpupicking ){

				_swapMaterial();
				var pixel = new Uint8Array(4);
				var gl = renderer.getContext();
				renderer.render(scene, camera, pickingRt);
				gl.readPixels(x, height-y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
				var id = (pixel[0] << 16) | (pixel[1] << 8) | (pixel[2]);
				_swapMaterial();
				
				if(id){
					object = pickingObjects[id-1];
				}
			}
			else {

				x = (x/width)*2-1;
				y = -(y/height)*2+1;
				var ray = projector.pickingRay(new THREE.Vector3(x, y, 0.5), camera);
				var intersects = ray.intersectObjects( pickingObjects );

				if( intersects.length > 0){
					var object = intersects[0];
				}
			}
			return object;
		}

		function _swapMaterial(){
			_.each(pickingObjects, function(mesh){
				var mat = mesh.material;
				mesh.material = mesh.__idmaterial__;
				mesh.__idmaterial__ = mat;
			})
		}
		// 监视canvas的大小变化
		function resize(){

			if( width == renderer.domElement.width &&
				height == renderer.domElement.height){
				return;
			}
			width = renderer.domElement.width;
			height = renderer.domElement.height;

			pickingRt = new THREE.WebGLRenderTarget( width, height );
			pickingRt.generateMipmaps = false;
			
		}

		var interval = setInterval(function(){
			resize();
		}, 100);


		//scene场景改变(添加或删除了物体)后对所有pickingobject的id的更新
		function updateScene(){

			pickingObjects = [];

			scene.traverse( function(node){

				if( node instanceof THREE.Mesh && node.enablepicking ){

					pickingObjects.push( node );
				}
			})

			_.each( pickingObjects, function(node, index){

				// material for picking, color is the index of this node
				if( ! node.__idmaterial__ ){
					node.__idmaterial__ = new THREE.MeshBasicMaterial();
				}
				node.__idmaterial__.color = new THREE.Color( index +1 );
			})
		}

		return {

			resize : resize,

			updateScene : updateScene,

			dispose : function(){
				clearInterval( interval );
			}

		}
	}

	function MouseEvent(props){

		this.cancelBubble = false;

		_.extend(this, props);
	}

	MouseEvent.prototype.stopPropagation = function(){
		
		this.cancelBubble = true;
	}

	MouseEvent.throw = function(eventType, target, props){

		var e = new MouseEvent(props);
		e.sourceTarget = target;

		// enable bubble
		while(target && !e.cancelBubble ){
			e.target = target;
			target.trigger(eventType, e);

			target = target.parent;
		}
	}

	return {

		create : create
	}
} )

//=============
// Util.js
// Assets Util
//=============
define("Core/Assets/Util-debug", [], function(require, exports, module){
	
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

	// some bridge function from treeview to scene

	// get path of scene node compatible to three view
	exports.getSceneNodePath = function( node ){
		var path = node.name;
		while(node.parent){
			node = node.parent;
			path = node.name + '/' + path;
		}
		return path;
	}

	exports.findSceneNode = function( path, parent ){

		if( path instanceof THREE.Object3D ){
			return path;
		}else if( ! _.isString(path) ){
			return;
		}

		var root = parent;
		if( path.charAt(0) == '/'){
			path = path.substring(1);
			root = exports.getRoot(root);
			// remove scene
			path = path.substring(root.name.length);
		}

		return _.reduce(_.compact(path.split('/')), function(node, name){
			if( ! node){
				return;
			}
			return node.getChildByName(name); q
		}, root);
	}

	exports.getRoot = function( node ){
		var root = node;
		while(node.parent){
			root = node.parent;
		}
		return root;
	}

})

//==========================================
//index.js
//加载当前目录下的所有组件
//==========================================
define("Core/Assets/index-debug", ["./Geometry-debug", "./Material-debug", "./Shader-debug", "./FileSystem-debug", "./Prefab-debug", "./Texture-debug", "./TextureCube-debug", "./Util-debug", "./Importer/index-debug", "./Importer/Binary-debug", "./Importer/Collada-debug", "./Importer/JSON-debug", "./Importer/Zip-debug", "./Importer/Image-debug", "./Importer/DDS-debug"], function(require, exports, module){

	exports.Geometry 	= require('./Geometry-debug');
	exports.Material 	= require('./Material-debug');
	exports.Prefab 		= require('./Prefab-debug');
	exports.Shader		= require('./Shader-debug');
	exports.Texture 	= require('./Texture-debug');
	exports.TextureCube = require('./TextureCube-debug');
	exports.FileSystem 	= require('./FileSystem-debug');
	exports.Util 		= require('./Util-debug');
	exports.Importer 	= require('./Importer/index-debug');

})


//========================
// Geometry.js
//
// Basic Geometry Asset
//
// Geometry Asset is part of Prefab Asset
//
// Save an geometry instance, which can be imported and exported as a json format asset
//========================
define("Core/Assets/Geometry-debug", [], function(require, exports, module){

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

		// https://github.com/mrdoob/three.js/issues/363
		// https://github.com/mrdoob/three.js/wiki/Updates

		// https://github.com/mrdoob/three.js/issues/2073
		// https://github.com/mrdoob/three.js/issues/363
		if( material && material.map ){
			geo.uvsNeedUpdate = true;
		}
		if( ! geo.__referencecount__ ){
			geo.__referencecount__ = 0;
		}

		var mesh = new THREE.Mesh(geo, material);
		if( ! material){
			mesh.material = null;	//set material to empty
		}

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

//========================
// Material.js
//
// Basic Material Asset
// Save an material instance, which can be imported and exported as a json format asset
// file extension, material
//========================
define("Core/Assets/Material-debug", ["./Shader-debug", "./FileSystem-debug"], function(require, exports, module){

	var ShaderAsset = require('./Shader-debug');
	var FS = require('./FileSystem-debug');

	var guid = 0;

	function create(mat){

		var name = mat && mat.name;
		mat = convertMaterial(mat);

		var ret = {

			type : 'material',

			name : name || 'Material_' + guid++,

			data : mat || null,

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
			bindShader : function(shader){
				bindShader( this.data, shader);
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
			},
			getThumb : function(size){
				return getThumb( this.data, size);
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

		mat && (mat.host = ret);

		return ret;
	}

	// we drop all the material types in THREE.js and leave a ShaderMaterial
	// to manage shaders, to keep material management more clearly;
	var uniformPropMap = {
		'phong' : {
			'diffuse' : 'color',
			'ambient' : 'ambient',
			'emissive' : 'emissive',
			'specular' : 'specular',
			'shininess' : 'shininess',
			'map' : 'map',
			'lightMap' : 'lightMap',
			'bumpMap' : 'bumpMap',
			'bumpScale' : 'bumpScale',
			'normalMap' : 'normalMap',
			'normalScale' : 'normalScale',
			'specularMap' : 'specularMap',
			'envMap' : 'envMap',
			'reflectivity' : 'reflectivity',
			'refractionRatio' : 'refractionRatio'
		},
		'lambert' : {
			'diffuse' : 'color',
			'ambient' : 'ambient',
			'emissive' : 'emissive',
			'map' : 'map',
			'lightMap' : 'lightMap',
			'specularMap' : 'specularMap',
			'envMap' : 'envMap',
			'reflectivity' : 'reflectivity',
			'refractionRatio' : 'refractionRatio'
		},
		'basic' : {
			'diffuse' : 'color',
			'map' : 'map',
			'lightMap' : 'lightMap',
			'specularMap' : 'specularMap',
			'envMap' : 'envMap',
			'reflectivity' : 'reflectivity',
			'refractionRatio' : 'refractionRatio'
		}
	}

	function convertMaterial(mat){
		var newMat;
		// convert other material types to shader material
		if( ! mat.shader ){
			if( mat instanceof THREE.MeshPhongMaterial){
				var shader = ShaderAsset.buildin['buildin-phong'].getInstance();
				_.each(uniformPropMap.phong, function(pName, uName){
					shader.uniforms[uName].value = mat[pName]
				})

				newMat = new THREE.ShaderMaterial;

				bindShader(newMat, shader);
			}
			else if( mat instanceof THREE.MeshLambertMaterial){
				var shader = ShaderAsset.buildin['buildin-lambert'].getInstance();
				_.each(uniformPropMap.lambert, function(pName, uName){
					shader.uniforms[uName].value = mat[pName]
				})
				newMat = new THREE.ShaderMaterial;
				
				bindShader(newMat, shader);
			}
			else if( mat instanceof THREE.MeshBasicMaterial){
				var shader = ShaderAsset.buildin['buildin-basic'].getInstance();
				_.each(uniformPropMap.basic, function(pName, uName){
					shader.uniforms[uName].value = mat[pName]
				})
				newMat = new THREE.ShaderMaterial;
				
				bindShader(newMat, shader);
			}
			else if(mat instanceof THREE.ShaderMaterial){
				newMat = mat;
				// create a shader asset;
				var shaderAsset = ShaderAsset.create(new ShaderAsset.Shader({
					uniforms : mat.uniforms,
					fragmentShader : mat.fragmentShader,
					vertexShader : mat.vertexShader
				}))
				bindShader(mat, shaderAsset.data);
			}
			//need to set the light true so the renderer will set the light params in as uniform
			//whats the fuck
			newMat.lights = true;	
			newMat.name = mat.name;
		}else{
			newMat = mat;
		}
		return newMat;
	}

	function read(m){

		var material = new THREE.ShaderMaterial;
		var shader = ShaderAsset.create();
		shader.import(material.shader);

		if(shader){
			bindShader( material, shader);
		}else{
			console.warn('shader '+m.shader+' not found');
		}

		return material;
	}

	function bindShader(material, shader){

		// get a shader copy
		shader = ShaderAsset.getInstance(shader);
		material.shader = shader;

		// also save these for three.js		
		material.uniforms = shader.uniforms;
		material.fragmentShader = shader.fragmentShader;
		material.vertexShader = shader.vertexShader;
		// enable the build-in materials map 
		_.each(shader.uniforms, function(u, name){
			if(u.type == 't'){
				if(name == 'map' ||
					name == 'lightMap' ||
					name == 'specularMap' ||
					name == 'envMap' ||
					name == 'normalMap' ||
					name == 'bumpMap'){

					if(u.value){
						material[name] = true;
					}
				}
			}
		})
		material.needsUpdate = true;
	}

	function toJSON( material ){

		var json = {
			name : material.name,
			shader : this.shader.export(),
		}
		
		return json;
	}

	function getCopy( mat ){

		var clonedMat = new THREE.ShaderMaterial();
		clonedMat.lights = true;
		clonedMat.name = mat.name;

		var shader = ShaderAsset.getCopy( mat.shader );
		bindShader(clonedMat, shader);
		
		return clonedMat;
	}

	// some ugly codes
	var previewLight = new THREE.DirectionalLight( 0xffffff );
	previewLight.position = new THREE.Vector3(2,2,2);
	var previewCamera = new THREE.PerspectiveCamera( 60, 1, 0.01, 10 );
	previewCamera.position.set(0.4, 0.4, 1.6);
	previewCamera.lookAt(new THREE.Vector3( 0, 0, 0 ));
	var previewRenderer = new THREE.WebGLRenderer( );
	var previewScene = new THREE.Scene();
	previewScene.add(previewLight);
	var previewSphereGeo = new THREE.SphereGeometry( 0.73, 10, 10 );

	function getThumb( mat, size){
		// get a clean copy of material
		var mesh = new THREE.Mesh(previewSphereGeo, getCopy(mat) );
		previewScene.add(mesh);
		previewRenderer.render(previewScene, previewCamera);
		previewRenderer.setSize(size, size);
		previewScene.remove(mesh);

		return previewRenderer.domElement.toDataURL();
	}

	function getConfig( material ){
		
		var props = {
			'name' : {
				type : 'input',
				value : material.name,
				onchange : function(value){
					material.name = value;
					material.host.name = value;
					material.host.host.setName(value);
				}
			},
			'shader' : {
				type : 'select',
				options : [{
					value : 'buildin-basic',
					description : 'Buildin Basic'
				},{
					value : 'buildin-lambert',
					description : 'Buildin Lambert'
				},{
					value : 'buildin-phong',
					description : 'Buildin Phong'
				},{
					value : 'custom',
					description : 'custom'
				}],
				value : (function(){
					var path = material.shader.host.getPath();
					// is a build in shader
					if( ShaderAsset.buildin[ path ] ){
						return path;
					}else{
						return 'custom'
					}
				})(),
				onchange : function(value, updatePartial){
					// build in shader
					if( ShaderAsset.buildin[value] ){

						bindShader( material, ShaderAsset.buildin[value].getInstance() );
					}else{
						var shader = FS.root.find(value);
						if( ! shader){
							console.warn( 'shader '+value+' not exist');
						}
						//query the shader;
						bindShader( material,  shader);
					}

					// update Shader Asset Part
					updatePartial && updatePartial( 'Shader' );
				}

			},
			'opacity' : {
				type : 'float',
				min : 0,
				max : 1,
				step : 0.005,
				value : material.opacity,
				onchange : function(value){
					material.opacity = value;
				}
			},
			'transparent' : {
				type : 'boolean',
				value : material.transparent,
				onchange : function(value){
					material.transparent = value;
				}		
			}
		}

		var shaderProps = {};

		_.each(material.shader.uniforms, function(u, name){
			
			if( ! u.configurable){
				return;
			}

			var prop = {};
			_.extend(prop, u);

			switch(u.type){
				case 'f':
					prop.type = 'float';
					prop.onchange = function(value){

						material.uniforms[name].value = value;
					}
					break;
				case 't':
					prop.type = 'texture';
					var tex = material.uniforms[name].value;
					if( ! tex){
						prop.value = '';
					}
					else if( ! tex.host){
						console.warn('texture '+tex.name+' is not in the project');
						return;
					}
					else{
						prop.value = tex.host.getPath();	// texture path in the project
					}

					prop.onchange = function(value){
						// delete the texture when the value is ''
						if( ! value){
							material.uniforms[name].value = null;
								if(name == 'map' ||
								name == 'lightMap' ||
								name == 'specularMap' ||
								name == 'envMap'){

								material[name] = false; 
								material.needsUpdate = true;
							}
						}
						else{
							var texAsset = FS.root.find(value).data;
							if( ! texAsset){
								console.warn('texture '+value+' is not in the project');
								return;
							}
							material.uniforms[name].value = tex.data;

							if(name == 'map' ||
								name == 'lightMap' ||
								name == 'specularMap' ||
								name == 'envMap' ||
								name == 'normalMap' ||
								name == 'bumpMap'){

								material[name] = true;
								material.needsUpdate = true;
							}
						}
					}
					break;
				case 'v2':
					prop.value = _.pick(u.value, 'x', 'y');
				case 'v3':
					prop.value = _.pick(u.value, 'x', 'y', 'z');
				case 'v4':
					prop.value = _.pick(u.value, 'x', 'y', 'z', 'w');
					prop.type = 'vector';
					prop.onchange = function(key, value){
						material.uniforms[name].value[key] = value;
					}
					break;
				case 'c':
					prop.type = 'color';
					prop.value = u.value.getHex();
					prop.onchange = function(value){
						material.uniforms[name].value.setHex(value);
					}

					break;
			}

			shaderProps[name] = prop;
		})
		
		return {

			'Material Asset' : {
				type : 'layer',
				sub : props
			},

			'Shader' : {
				type : 'layer',
				sub : shaderProps
			}
		}
	}

	exports.create = create;
	// static functions
	exports.export = toJSON;

	exports.bindShader = bindShader;

	exports.getCopy = getCopy;
})

//========================
// Shader.js
//
// Basic Shader Asset
//
// Shader Asset is part of Material Asset
// the uniforms in Shader Assets has no specific value,
// it defines the config of the each uniform, like min value, max value and so on
// only after attached to the material, the values will be used;
//
// so DONT DIRECTLY USE THE SHADER DATA, ITS ONLY A TEMPLATE!!
//========================
define("Core/Assets/Shader-debug", [], function(require, exports, module){

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

			clonedUniform[name] = {};
			_.extend(clonedUniform[name], u);

			// deep clone the value except texture
			// to keep the unfiorm clean
			clonedUniform[name].value = self.cloneValue( u.value );

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
			return clonedArray;
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

			uniforms[key] = {};
			_.extend(uniforms[key], uniform);

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

			uniforms[key].value = value;

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

			json.uniforms[key] = {};
			_.extend(json.uniforms[key], uniform);

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
					value = 0;
			}

			json.uniforms[key].value = value;
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
	exports.buildin = {};
	var basicShader = new Shader( THREE.ShaderLib.basic);
	basicShader.name = 'buildin-basic';
	exports.buildin['buildin-lambert'] = exports.create( basicShader );
	
	// extend the build in shader configs
	basicShader.uniforms['diffuse'].configurable = true;
	basicShader.uniforms['map'].configurable = true;
	basicShader.uniforms['lightMap'].configurable = true;
	basicShader.uniforms['envMap'].configurable = true;
	_.extend(basicShader.uniforms['reflectivity'], {
		min : 0,
		max : 1.0,
		step : 0.005,
		configurable : true	//enable config
	});
	_.extend(basicShader.uniforms['refractionRatio'], {
		min : 0,
		max : 1.0,
		step : 0.005,
		configurable : true	//enable config
	})

	var phongShader = new Shader( THREE.ShaderLib.phong );
	phongShader.name = 'buildin-phong';
	exports.buildin['buildin-phong'] = exports.create( phongShader );
	
	// extend the build in shader configs
	phongShader.uniforms['diffuse'].configurable = true;
	phongShader.uniforms['ambient'].configurable = true;
	phongShader.uniforms['emissive'].configurable = true;
	phongShader.uniforms['specular'].configurable = true;

	phongShader.uniforms['map'].configurable = true;
	phongShader.uniforms['lightMap'].configurable = true;
	phongShader.uniforms['normalMap'].configurable = true;
	_.extend(phongShader.uniforms['normalScale'], {
		min : 0,
		max : 10.0,
		step : 0.005
	});
	phongShader.uniforms['envMap'].configurable = true;
	_.extend(phongShader.uniforms['reflectivity'], {
		min : 0,
		max : 1.0,
		step : 0.005,
		configurable : true	//enable config
	});
	_.extend(phongShader.uniforms['refractionRatio'], {
		min : 0,
		max : 1.0,
		step : 0.005,
		configurable : true	//enable config
	})
	_.extend(phongShader.uniforms['shininess'], {
		min : 0,
		max : 1000.0,
		step : 2,
		configurable : true	//enable config
	})

	var lambertShader = new Shader( THREE.ShaderLib.lambert);
	lambertShader.name = 'buildin-lambert';
	exports.buildin['buildin-lambert'] = exports.create( lambertShader );
	// extend the build in shader configs
	lambertShader.uniforms['diffuse'].configurable = true;
	lambertShader.uniforms['ambient'].configurable = true;
	lambertShader.uniforms['emissive'].configurable = true;

	lambertShader.uniforms['map'].configurable = true;
	lambertShader.uniforms['lightMap'].configurable = true;
	lambertShader.uniforms['envMap'].configurable = true;

	_.extend(lambertShader.uniforms['reflectivity'], {
		min : 0,
		max : 1.0,
		step : 0.01
	});
	_.extend(lambertShader.uniforms['refractionRatio'], {
		min : 0,
		max : 1.0,
		step : 0.01
	})
})

//=====================
// FileSystem.js
// simulate a file system simply
// Todo : add FileSystem api support and save data on hdd
//=====================
define("Core/Assets/FileSystem-debug", [], function(require, exports, module){

	var File = function(name, asset){

		this.type = 'file';
		this.name = name || '';
		
		this.data = null;
		if(asset){
			this.attach( asset, true );
		}

		this.parent = null;
	}

	_.extend(File.prototype, Backbone.Events);

	File.prototype.getRoot = function(){
		var root = this;
		while(root.parent){
			root = root.parent;
		}
		return root;
	}
	File.prototype.setName = function(name, silent){
		if( ! silent){
			// trigger before it is really updated
			this.getRoot().trigger('updated:name', this, name);
		}

		this.name = name;
	
	}
	File.prototype.attach = function(asset, silent){
		this.data = asset;
		asset.host = this;

		if( ! silent){
			this.getRoot().trigger('attached:asset', this, asset);
		}
	}
	File.prototype.detach = function(silent){
		this.data = null;
		asset.host = null;

		if( ! silent){
			this.getRoot().trigger('detached:asset', this);
		}
	}
	File.prototype.getPath = function(){
		if( ! this.parent ){
			return this.name;
		}
		return this.parent.getPath() + this.name;
	}

	var Folder = function(name){

		this.name = name || '';

		this.type = 'folder'

		this.children = [];
	}

	_.extend(Folder.prototype, Backbone.Events);

	Folder.prototype.setName = function(name, silent){
		if( ! silent){
			// trigger before it is really updated
			this.getRoot().trigger('updated:name', this, name);
		}

		this.name = name;
	}
	Folder.prototype.getRoot = function(){
		var root = this;
		while(root.parent){
			root = root.parent;
		}
		return root;
	}
	Folder.prototype.add = function(node, silent){

		var isMove = false;

		if(node.parent){
			isMove = true;

			if(node.parent == this){
				return;
			}
			node.parent.remove(node, true);
		}
		this.children.push( node );

		if(isMove){
			var parentPrev = node.parent;
		}
		node.parent = this;

		if( ! silent){
			if( isMove ){
				this.getRoot().trigger('moved:node', this, parentPrev, node);
			}else{
				this.getRoot().trigger('added:node', this, node);
			}
		}
	}
	Folder.prototype.remove = function(node, silent){
		if( _.isString(node) ){
			node = this.find(node);
		}
		// call before the node is really removed
		// because we still need to get node path 
		if( ! silent){

			this.getRoot().trigger('removed:node', this, node);
		}

		node.parent = null;
		_.without( this.children, node);

	}
	// traverse the folder
	Folder.prototype.traverse = function(callback){
		callback && callback( this );
		_.each( this.children, function(child){
			child.traverse( callback );
		} )
	}
	// get the folder's absolute path
	Folder.prototype.getPath = function(){
		if( ! this.parent ){
			return this.name + '/';
		}
		return this.parent.getPath() + this.name + '/';
	}
	// find a folder or file 
	Folder.prototype.find = function(path){
		var root = this;
		// abosolute path
		if( path.charAt(0) == '/'){
			path = path.substring(1);
			root = exports.root;
		}
		return _.reduce( _.compact(path.split('/')), function(node, name){
			if( ! node){
				return;
			}
			if( name == '..'){
				return node.parent;
			}
			else if( name =='.'){
				return node;
			}
			else{
				return _.find(node.children, function(item){
					return item.name==name
				});
			}
		}, root);
	}
	Folder.prototype.createFolder = function(path, silent){
		path = _.compact(path.split('/'));
		var ret = _.reduce(path, function(node, name){
			var folder = node.find(name);
			if( !folder ){
				folder = new Folder(name);
				node.add( folder, silent );
			}
			return folder;
		}, this);

		if( ! silent){

			this.getRoot().trigger('created:folder', this, ret);
		}
		return ret;
	}
	Folder.prototype.createFile = function(path, asset, silent){
		dir = _.compact(path.split('/'));
		var fileName = dir.pop();
		var folder = this.createFolder(dir.join('/'), silent);
		var file = folder.find(fileName);
		if( ! file){
			file = new File( fileName, asset );

			folder.add( file, silent );

			if( ! silent){
				this.getRoot().trigger('created:file', this, file);
			}
		}

		return file;
	}

	var Root = function(){
		Folder.call(this);
	};
	Root.prototype = new Folder;
	Root.prototype.getPath = function(){
		return '/';
	}

	exports.root = new Root();
	exports.Folder = Folder;
	exports.File = File;
})

//========================
// Prefeb.js
//
// Node Prefeb Asset
// Save a copy of node instance, it will be packed as a zip file when storing on the disk.
// file extension, prefeb
//========================
define("Core/Assets/Prefab-debug", ["./Geometry-debug", "./Material-debug", "./Shader-debug", "./FileSystem-debug", "./Texture-debug", "./TextureCube-debug", "./Util-debug"], function(require, exports, module){

	var Geometry = require('./Geometry-debug');
	var Material = require('./Material-debug');
	var Texture = require('./Texture-debug');
	var TextureCube = require('./TextureCube-debug');
	var Util = require('./Util-debug');

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

//========================
// Texture.js
//
// Texture Asset
// Save an texture instance, which can be imported and exported as a json format asset and images
// file extension texture
//========================
define("Core/Assets/Texture-debug", [], function(require, exports, module){

	var imageCache = {};

	var guid = 0;

	function create(texture){

		var name = texture && texture.name;

		var ret = {

			type : 'texture',

			name : name || 'Texture_' + guid++,

			data : texture || null,

			host : null,

			import : function(json){
				this.data = read(json);

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
			// config for inspector
			getConfig : function(){
				return getConfig(this.data );
			},
			getThumb : function(size){
				return getThumb(this.data, size);
			},
			getPath : function(){
				if( this.host){
					return this.host.getPath();
				}
			}
		}

		texture && (texture.host = ret);

		return ret;
	}

	function read(json){
		
		var texture = new THREE.Texture({
			wrapS : t.wrapS,
			wrapT : t.wrapT,
			magFilter : t.magFilter,
			minFilter : t.minFilter,
			anisotropy : t.anisotropy,
			format : t.format,
			type : t.type,
			offset : new THREE.Vector2( t.offset[0], t.offset[1] ),
			repeat : new THREE.Vector2( t.repeat[1], t.repeat[1] )
		});

		var imgSrc = json.image
		// don't cache base 64 format
		if( imgSrc.indexOf('data:image/')==0 ){
			var img = new Image();
			img.onload = function(){
				texture.needsUpdate = true;
			}
			img.src = imageSrc;
			texture.image = img;
		}
		else if( imgSrc ){
			if( imageCache[ imgSrc ] ){
				texture.image = imageCache[ imgSrc];
			}else{
				var img = new Image();
				img.onload = function(){
					texture.needsUpdate = true;
				}
				img.src = imageSrc;
				texture.image = img;
				imageCache[imgSrc] = img;
			}

		}

		return texture;
	}

	function toJSON( texture ){
		
		var json = {};

		// todo cube texture?
		_.extend(json, {
			'image' : texture.image.src,	//data url todo needs save texture depedently
			'wrapS' : texture.wrapS,
			'wrapT' : texture.wrapT,
			'magFilter' : texture.magFilter,
			'minFilter' : texture.minFilter,
			'anisotropy' : texture.anisotropy,
			'format' : texture.format,
			'type' : texture.type,
			'offset' : [texture.offset.x, texture.offset.y],
			'repeat' : [texture.repeat.x, texture.repeat.y]
		});

		return json;
	}

	function getInstance( texture ){
		texture.needsUpdate = true;
		return texture;
	}
	
	function getCopy( texture ){
		return texture.clone();
	}

	function getThumb( texture, size ){
		if( texture instanceof THREE.DataTexture ||
			texture instanceof THREE.CompressedTexture){
			return;
		}
		var canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		canvas.getContext('2d').drawImage(texture.image, 0, 0, size, size);
		return canvas.toDataURL();
	}

	function getConfig( texture ){
		return {
			'Texture Asset' : {
				type : 'layer',
				'class' : 'texture',
				sub : {
					'name' : {
						type : 'input',
						value : texture.name,
						onchange : function(value){
							texture.name = value;
							// set asset name
							texture.host.name = value;
							// set file name
							texture.host.host.setName(value);
						}
					},
					'image' : {
						type : 'image',
						value : texture.image,
						onchange : function(value){
							// image must be loaded before calling this onchange method
							texture.image = value;
							texture.image.needsUpdate = true;
						}
					},
					'mapping' : {
						type : 'select',
						value : texture.mapping,
						options : [{
							value : 1000,
							description : 'Repeat'
						}, {
							value : 1001,
							description : 'Clamp to edge'
						}, {
							value : 1002,
							description : 'Mirror'
						}],
						onchange : function(value){
							texture.mapping = value;
							texture.needsUpdate = true;
						}
					},
					'magFilter' : {
						type : 'select',
						value : texture.magFilter,
						options : filterOptions,
						onchange : function(value){
							texture.magFilter = value;
						}
					},
					'minFilter' : {
						type : 'select',
						value : texture.minFilter,
						options : filterOptions,
						onchange : function(value){
							texture.minFilter = value;
						}
					},
					'anisotropy' : {
						type : 'boolean',
						value : texture.anisotropy,
						onchange : function(value){
							texture.anisotropy = value;
						}
					},
					// need to move the offset and repeat to material
					'offset' : {
						type : 'vector',
						value : {
							x : texture.offset.x,
							y : texture.offset.y
						},
						min : -100,
						max : 100,
						step : 0.01,
						onchange : function(key, value){
							texture.offset[key] = value;
						}
					},
					'repeat' : {
						type : 'vector',
						value : {
							x : texture.repeat.x,
							y : texture.repeat.y
						},
						min : 0,
						max : 1000,
						step : 0.1,
						onchange : function(key, value){
							texture.repeat[key] = value;
						}
					}
				}
			}
			
		}
	}

	var filterOptions = [{
		value : 1003,
		description : 'Nearst'
	},
	{
		value : 1004,
		description : 'Nearest MipMapNearest'
	},
	{
		value : 1005,
		description : 'Nearest MipMapLinear'
	},
	{
		value : 1006,
		description : 'Linear'
	},
	{
		value : 1007,
		description : 'Linear MipMapNearest'
	},
	{
		value : 1008,
		description : 'Linear MipMapLinear'
	}]

	exports.create = create;
	// static functions
	exports.export = toJSON;

	exports.getCopy = getCopy;
})

//========================
// TextureCube.js
//
// TextureCube Asset
// Save an geometry instance
// Unlike texture asset, texture cube will pack all sides images in a zip file
// file extension texturecube
//========================
define("Core/Assets/TextureCube-debug", [], function(require, exports, module){

	var imageCache = {};

	var guid = 0;

	function create(texture){

		var name = texture && texture.name;

		var ret = {

			type : 'texturecube',

			name : name || 'TextureCube_' + guid++,

			data : texture || null,

			host : null,

			import : function(json){
				this.data = read(json);

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
			getPath : function(){
				if( this.host){
					return this.host.getPath();
				}
			}
		}

		texture && (texture.host = ret);

		return ret;
	}

	function read(json){

		var texture = new THREE.Texture({
			wrapS : t.wrapS,
			wrapT : t.wrapT,
			magFilter : t.magFilter,
			minFilter : t.minFilter,
			anisotropy : t.anisotropy,
			format : t.format,
			type : t.type,
			offset : new THREE.Vector2( t.offset[0], t.offset[1] ),
			repeat : new THREE.Vector2( t.repeat[1], t.repeat[1] )
		});

		var imgLoadCount = 0;
		_.each( json.image.length, function(imgSrc, index){
			// don't cache base 64 format
			if( imgSrc.indexOf('data:image/')==0 ){
				var img = new Image();
				img.onload = function(){
					imgLoadCount--;
					if( imgLoadCount == 0){
						texture.needsUpdate = true;
					}
				}
				img.src = imageSrc;
				imgLoadCount++;
				texture.image[index] = img;
			}
			else if( imgSrc ){
				if( imageCache[ imgSrc ] ){
					texture.image[index] = imageCache[ imgSrc];
				}else{
					var img = new Image();
					img.onload = function(){
						imgLoadCount--;
						if( imgLoadCount == 0 ){
							texture.needsUpdate = true;
						}
					}
					img.src = imageSrc;
					imgLoadCount++;
					texture.image[index] = img;
					imageCache[imgSrc] = img;
				}
			}

		} )

		return texture;
	}

	function toJSON(texture){

		var json = {};

		// todo cube texture?
		_.extend(json, {
			'image' : [],	//data url todo needs save texture depedently
			'wrapS' : texture.wrapS,
			'wrapT' : texture.wrapT,
			'magFilter' : texture.magFilter,
			'minFilter' : texture.minFilter,
			'anisotropy' : texture.anisotropy,
			'format' : texture.format,
			'type' : texture.type,
			'offset' : [texture.offset.x, texture.offset.y],
			'repeat' : [texture.repeat.x, texture.repeat.y]
		});

		_.each(texture.image.length, function(img){
			json.image.push(img.src);
		} )

		return json;
	}

	function getInstance( texture ){
		texture.needsUpdate = true;
		return texture;
	}

	function getCopy(){
		return texture.clone();
	}

	exports.create = create;
	// static functions
	exports.export = toJSON;

	exports.getCopy = getCopy;
})

//==========================================
//index.js
//加载当前目录下的所有组件
//==========================================
define("Core/Assets/Importer/index-debug", ["./Binary-debug", "../Geometry-debug", "../Prefab-debug", "../Material-debug", "../Shader-debug", "../FileSystem-debug", "../Texture-debug", "../TextureCube-debug", "../Util-debug", "./Collada-debug", "./JSON-debug", "./Zip-debug", "./Image-debug", "./DDS-debug"], function(require, exports, module){

	exports.Binary 	= require('./Binary-debug');
	exports.Collada = require('./Collada-debug');
	exports.JSON 	= require('./JSON-debug');
	exports.Zip 	= require('./Zip-debug');
	exports.Image = require('./Image-debug');
	exports.DDS = require('./DDS-debug');

})

//=======================
// Binary.js
// import from binary file
//=======================

define("Core/Assets/Importer/Binary-debug", ["../Geometry-debug", "../Prefab-debug", "../Material-debug", "../Shader-debug", "../FileSystem-debug", "../Texture-debug", "../TextureCube-debug", "../Util-debug"], function(require, exports, module){

	var binaryLoader = new THREE.BinaryLoader();
	var GeometryAsset = require('../Geometry-debug'),
		PrefabAsset = require('../Prefab-debug'),
		AssetUtil = require('../Util-debug');

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

//=========================
// Collada.js
// import from collada file
//=========================

define("Core/Assets/Importer/Collada-debug", ["../Geometry-debug", "../Prefab-debug", "../Material-debug", "../Shader-debug", "../FileSystem-debug", "../Texture-debug", "../TextureCube-debug", "../Util-debug"], function(require, exports, module){

	var colladaLoader = new THREE.ColladaLoader();
	var GeometryAsset = require('../Geometry-debug'),
		PrefabAsset = require('../Prefab-debug'),
		MaterialAsset = require('../Material-debug'),
		AssetUtil = require('../Util-debug');

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

//=========================
// Json.js
// import from json file
//=========================

define("Core/Assets/Importer/JSON-debug", ["../Geometry-debug", "../Prefab-debug", "../Material-debug", "../Shader-debug", "../FileSystem-debug", "../Texture-debug", "../TextureCube-debug", "../Util-debug"], function(require, exports, module){

	var jsonLoader = new THREE.JSONLoader();
	var GeometryAsset = require('../Geometry-debug'),
		PrefabAsset = require('../Prefab-debug'),
		MaterialAsset = require('../Material-debug'),
		AssetUtil = require('../Util-debug');

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


define("Core/Assets/Importer/Zip-debug", ["../Geometry-debug", "../Prefab-debug", "../Material-debug", "../Shader-debug", "../FileSystem-debug", "../Texture-debug", "../TextureCube-debug", "../Util-debug"], function(require, exports, module){

	var jsonLoader = new THREE.JSONLoader();
	var GeometryAsset = require('../Geometry-debug'),
		PrefabAsset = require('../Prefab-debug'),
		MaterialAsset = require('../Material-debug'),
		AssetUtil = require('../Util-debug');

})

//=========================
//	Image.js
//	import from image files
//==========================

define("Core/Assets/Importer/Image-debug", ["../Texture-debug"], function(require, exports, module){

	var TextureAsset = require('../Texture-debug');

	exports.import = function(name, data, folder, callback){

		var image = new Image;
		image.onload = function(){
			
			var texture = new THREE.Texture(image);
			texture.name = name;
			
			var texFolder = folder.createFolder('textures');
			var texAsset = TextureAsset.create(texture);

			texFolder.createFile(texAsset.name, texAsset);

			callback && callback(texAsset);
		}
		image.src = data;
	}

	exports.importFromFile = function(file, folder, callback){

		var reader = new FileReader();
		reader.onload = function(evt){

			if( evt.target.readyState == FileReader.DONE ){

				exports.import( file.name, evt.target.result, folder, function(res){
					callback && callback(res);
				});
			}
		}
		reader.readAsDataURL( file );
	}

	exports.importFromURL = function(url, folder, callback){
		
	}
})

//=========================
//	DDS.js
//	import from dds format files
//==========================

define("Core/Assets/Importer/DDS-debug", ["../Texture-debug"], function(require, exports, module){

	var TextureAsset = require('../Texture-debug');

	exports.import = function(name, data, folder){

		var dds = THREE.ImageUtils.parseDDS( data, true);
		
		// almost from THREE.ImageUtils.loadCompressedTexture
		var texture = new THREE.CompressedTexture();

		texture.name = name;
		texture.format = dds.format;
		texture.mipmaps = dds.mipmaps;
		// image.width, image.height is useless for webgl renderer
		// renderer will use mimaps instead of image property
		texture.image.width = dds.width;
		texture.image.height = dds.height;
		// tell renderer not to generate mip maps
		texture.generateMipmaps = false;

		var texFolder = folder.createFolder('textures');
		var texAsset = TextureAsset.create(texture);

		texFolder.createFile(texAsset.name, texAsset);

		return texAsset;
	}

	exports.importFromFile = function(file, folder, callback){

		var reader = new FileReader();
		reader.onload = function(evt){

			if( evt.target.readyState == FileReader.DONE ){

				var res = exports.import( file.name, evt.target.result, folder);
				callback && callback(res);
			}
		}
		reader.readAsArrayBuffer( file );
	}

	exports.importFromURL = function(url, folder, callback){
		
	}
})

//==========================================
//index.js
//加载当前目录下的所有组件
//==========================================
define("Core/UIBase/index-debug", ["./Button-debug", "./Checkbox-debug", "./Float-debug", "./Image-debug", "./Input-debug", "./Label-debug", "./Color-debug", "./Layer-debug", "./Link-debug", "./Node-debug", "./Panel-debug", "./Select-debug", "./Texture-debug", "./Tree-debug", "./Vector-debug", "./Video-debug", "./Tab-debug", "./Mixin/index-debug", "./Mixin/Collapsable-debug", "./Mixin/Scrollable-debug", "./Mixin/InputPin-debug", "./Mixin/Pin-debug", "./Mixin/OutputPin-debug"], function(require, exports, module){

	exports.Button 		= require('./Button-debug'); 
	exports.Checkbox 	= require('./Checkbox-debug');
	exports.Float 		= require('./Float-debug');
	exports.Image 		= require('./Image-debug');
	exports.Input 		= require('./Input-debug');
	exports.Label 		= require('./Label-debug');
	exports.Color 		= require('./Color-debug');
	exports.Layer 		= require('./Layer-debug'); 
	exports.Link 		= require('./Link-debug'); 
	exports.Node 		= require('./Node-debug');
	exports.Panel 		= require('./Panel-debug');
	exports.Select 		= require('./Select-debug');
	exports.Texture 	= require('./Texture-debug');
	exports.Tree 		= require('./Tree-debug');
	exports.Vector 		= require('./Vector-debug');
	exports.Video 		= require('./Video-debug');
	exports.Tab 		= require('./Tab-debug');
	exports.Mixin 		= require('./Mixin/index-debug');
})


//======================================
// Button.js
// 按钮组件
//======================================

define("Core/UIBase/Button-debug", [], function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			name : '',
			label : ''
		}
	})

	var View = Backbone.View.extend({

		tagName : 'div',

		className : 'lblend-button',

		template : '<button className="lblend-common-button" data-html="model.label"></button>',

		model : null,

		initialize : function(){
			if( ! this.model){
				this.model = new Model;
			}
			this.render();
		},

		events : {
			'click button' : 'onclick'
		},

		render : function(){
			var self = this;

			self.$el.html(this.template);

			rivets.bind( this.$el, { model : this.model } );
		}, 

		onclick : function(){
			this.trigger('click');
		}
	})

	exports.View = View;

	exports.Model = Model;

	Model.prototype.__viewconstructor__ = View;
})

//=================
// Checkbox.js
// Boolean value
//=================
define("Core/UIBase/Checkbox-debug", [], function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			name : '',
			value : false	//boolean
		}
	})

	var View = Backbone.View.extend({

		type : 'CHECKBOX',

		tagName : 'div',

		className : 'lblend-checkbox',

		template : '<input type="checkbox" data-checked="model.value" data-name="model.name" /><label class="lblend-checkbox-label" data-html="model.name"></label>',

		model : null,

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}
			var self = this;
			
			this.render();
		},

		render : function(){
			var self = this;
			this.$el.html( this.template );
			rivets.bind( this.$el, { model : this.model } );
		}
		
	})

	Model.prototype.__viewconstructor__ = View;
	
	return {
		Model : Model,
		View : View
	}
})

//======================================
// Float.js
// Float类型参数编辑组件
// todo 加入没有最大和最小值的情况
//=======================================

define("Core/UIBase/Float-debug", [], function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			name : '',
			value : 0,
			min : -100000,
			max : 100000,
			step : 0
		},
		initialize : function(){
			this.on('change:value', function(){
				if(_.isNaN(this.get('value'))){
					this.set('value', 0);
				}
				if(this.get('value') < this.get('min') ){
					this.set('value', this.get('min'))
				}
				if(this.get('value') > this.get('max') ){
					this.set('value', this.get('max'))
				}
			}, this);

			this.on('change:min', function(){
				if(this.get('min') > this.get('max')){
					this.set('min', this.get('max'));
				}
				if(this.get('min') > this.get('value')){
					this.set('value', this.get('min'));
				}
			})

			this.on('change:max', function(){
				if(this.get('min') > this.get('max')){
					this.set('max', this.get('min'));
				}
				if(this.get('max') < this.get('value')){
					this.set('value', this.get('max'));
				}
			})
		}
	});

	var View = Backbone.View.extend({
		
		//type 全部大写
		type : 'FLOAT',

		model : null,

		tagName : 'div',

		className : 'lblend-float',

		template : '<div class="lblend-percent"></div><label>{{label}}</label> <span>{{value}}</span>',

		editModeTemplate : '<div class="lblend-percent"></div><input type="text" value="{{value}}" />',

		editMode : false,

		events : {
			'click ' : 'enterEditMode',
			'mousedown ' : 'enterDragMode'
		},

		initialize : function(){
			if( ! this.model){
				this.model = new Model;
			}

			this.model.on('change:value', this.updateValue, this);
			this.model.on('change:max', this.updatePercent, this);
			this.model.on('change:min', this.updatePercent, this);

			this.model.on('change:name', function(){
				this.$el.find('label').html(this.model.get('name'));
			}, this)
			
			this.render();
		},

		render : function(){

			if(this.editMode){

				this.$el.html(_.template(this.editModeTemplate, {
					value : Math.round(this.model.get('value')*1000)/1000
				}))
			}
			else{

				this.$el.html(_.template(this.template, {
					label : this.model.get('name'),
					value : Math.round(this.model.get('value')*1000)/1000
				}));
			}
			//update the percent bar
			this.updatePercent();
		},

		updateValue : function(){

			if( this.editMode){

				this.$el.find('input').val(Math.round(this.model.get('value')*1000)/1000);
			}else{

				this.$el.find('span').html(Math.round(this.model.get('value')*1000)/1000);
			}
			this.updatePercent();
		},

		updatePercent : function(){

			var percent = (this.model.get('value') - this.model.get('min'))  / (this.model.get('max') - this.model.get('min'));
			this.$el.find('.lblend-percent').width(percent * 100+'%');
		},

		enterEditMode : function(){
			var self = this;

			if(this.editMode){
				return ;
			}
			this.editMode = true;
			this.render();

			var $input = this.$('input');
			$input.focus();

			//exit edit mode when blur
			$input.blur(function(){
				self.editMode = false;
				self.render();
			})
			//update the value
			$input.change(function(){
				self.model.set('value', parseFloat(this.value));
			})
		},

		enterDragMode : function(e){

			if( this.editMode){
				return true;
			}

			var self = this,
				oldX = e.pageX;

			function mouseMoveHandler(e){

				var x = e.pageX;
				var offsetX = x - oldX;
				self.model.set('value', self.model.get('value')+offsetX*self.model.get('step'));
				oldX = x;
			}

			function mouseUpHandler(e){

				$(document.body).unbind('mousemove', mouseMoveHandler);
				$(document.body).unbind('mouseup', mouseUpHandler);
				
			}

			$(document.body).bind('mousemove', mouseMoveHandler);

			$(document.body).mouseup('mouseup', mouseUpHandler);
		}

	});
	//
	//Float类型参数的编辑界面，支持拖拽调整大小，单击进行输入的交互
	//
	exports.View = View;

	exports.Model = Model;

	//这个Model对应的View
	Model.prototype.__viewconstructor__ = View;
})

//=======================================
//	Image.js
//	
//=======================================

define("Core/UIBase/Image-debug", [], function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			name : '',
			filename : '',	//文件位置
			src : null	//HTMLImageElement
		}
	});

	var View = Backbone.View.extend({

		type : 'IMAGE',

		tagName : 'div',

		className : 'lblend-image',

		template : '<label class="lblend-image-label" data-html="model.name"></label>\
					<span class="lblend-image-filename" data-html="model.filename"></span>\
					<div class="lblend-image-wrapper">\
						<img data-src="model.src" />\
					</div>',

		model : null,

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}

			this.render();

			this.on('dispose', function(){
			})
		},

		render : function(){

			this.$el.html( this.template );

			rivets.bind(this.$el, {model:this.model});
			
		}


	})

	exports.View = View;

	exports.Model = Model;

	Model.prototype.__viewconstructor__ = View;
})

//=================
// Input.js
// 
//=================
define("Core/UIBase/Input-debug", [], function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			name : '',
			value : ''
		}
	})

	var View = Backbone.View.extend({

		type : 'INPUT',

		tagName : 'div',

		className : 'lblend-input',

		model : null,

		template : '<label class="lblend-input-label" data-html="model.name"></label><input type="text" data-value="model.value" />',

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}
			var self = this;

			this.render();
		},

		render : function(){
			var self = this;
			this.$el.html( this.template );
			rivets.bind( this.$el, { model : this.model } );
		}

	})

	Model.prototype.__viewconstructor__ = View;
	
	return {
		Model : Model,
		View : View
	}
})

//=================
// Label.js
// 
//=================
define("Core/UIBase/Label-debug", [], function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			name : '',
			value : ''
		}
	})

	var View = Backbone.View.extend({

		type : 'LABEL',

		tagName : 'div',

		className : 'lblend-label',

		model : null,

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}
			var self = this;

			this.model.on('change:value', function(model, value){
				self.$el.html(value);
			})
			this.render();
		},

		render : function(){
			var self = this;
			this.$el.html(this.model.get('value'));
		}
		
	})

	Model.prototype.__viewconstructor__ = View;
	
	return {
		Model : Model,
		View : View
	}
})

//===================================
// Color.js
// http://bgrins.github.com/spectrum/
//===================================
define("Core/UIBase/Color-debug", [], function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			name : '',
			color : 0	//hex string
		}
	})

	var View = Backbone.View.extend({

		type : 'COLOR',

		tagName : 'div',

		className : 'lblend-color',

		template : '<label class="lblend-color-label" data-html="model.name"></label>\
						<div class="lblend-color-picker">\
							<input type="text" data-value="model.color"/>\
						</div>',

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}

			this.render();

			this.on('dispose', function(){
				this.$input.spectrum("destroy");
			}, this);
			this.model.on('change:color', function(model, value){
				this.$input.spectrum('set', value);
			}, this)
		},

		$input : null,

		render : function(){
			var self = this;

			this.$el.html(_.template(this.template) );
			rivets.bind(this.$el, {model : this.model});

			var $input = this.$el.find('.lblend-color-picker input');
			$input.spectrum({
				clickoutFiresChange : true,
				showButtons : false,
				showInput : true,
				preferredFormat : 'hex'
			});

			this.$input = $input;
		}
	})

	return {
		Model : Model,
		View : View
	}
})

//=========================
// Layer.js
// 容器组件
// todo 尽量减少重渲染次数
//=========================

define("Core/UIBase/Layer-debug", [], function(require, exports, module){
	
	var Collection = Backbone.Collection.extend({
		name : ''
	});

	//存放Collection的Wrapper Model
	//
	//因为父元素的Collection不能用Collection作子元素，所以需要一个Model来
	//做包装放入父元素的Collection内
	//
	//只有collection一个值
	var WrapperModel = Backbone.Model.extend({
		defaults : {
			collection : new Collection
		}
	})

	var View = Backbone.View.extend({

		type : 'LAYER',

		tagName : 'div',

		className : 'lblend-layer',

		collection : null,

		template : '<h5 class="lblend-layer-label">{{label}}</h5><div class="lblend-list"></div>',

		//
		//用作子元素的所有一渲染的view的缓存
		//
		_views : [],

		initialize : function(){
			if( ! this.collection){
				this.collection = new Collection;
			}
			
			this.collection.on('add', this._addModel, this);

			this.collection.on('remove', this._removeModel, this);

			this.render();

			//recursive
			//remove the deepest first
			this.on('dispose', function(){
				this.removeAll();
			}, this);
		},

		$list : null,
		$label : null,

		render : function(){
			var self = this;

			self.el.innerHTML = _.template(this.template, {
				label : this.collection.name || ''
			});
			self._views = [];
			// 缓存list的dom和label的dom
			self.$list = self.$el.children('.lblend-list');
			self.$label = self.$el.children('.lblend-layer-label');

			//递归渲染所有子元素
			self.collection.forEach(function(item, index){
				
				var view;

				if(item instanceof WrapperModel){	//子元素也是容器层（包括Vector类）
					var col = item.get('collection');
					view = new col.__viewconstructor__({
						collection : col
					})
				}else{
					view = new item.__viewconstructor__({
						model : item
					});
				}

				if(view){

					view.parent = self;

					view.render();
					self.$list.append(view.$el);
					self._views.push(view)
				}
			})
		},
		
		_addModel : function(model){
			//如果该组件只是被创建，还没有被渲染成dom元素
			//则直接渲染
			var view;
			if(model instanceof WrapperModel){	//是容器层
				var coll = model.get('collection');
				view = new coll.__viewconstructor__({
					collection : coll
				})
			}else{
				view = new model.__viewconstructor__({
					model : model
				});
			}
			
			view.parent = this;
			this.$list.append(view.$el);
			this._views.push(view);
		},

		_removeModel : function(model){

			_.each(this._views, function(view){
				if(view.model === model || view.collection === model.get('collection')){
					_.without(this._views, view);
					view.$el.remove();
				}
			})
		},

		appendView : function(view){

			if(view.parent){
				view.parent.removeView(view);
			}

			if(view.model){
				// 不触发collection的添加事件
				this.collection.push(view.model, {silent : true});
			}
			else if(view.collection){

				var model = new WrapperModel({
					collection : view.collection
				});
				this.collection.push(model, {silent : true});
			}

			if(view){
				view.parent = this;
				this.$list.append(view.$el);
				this._views.push(view);
			}
		},

		removeView : function(view){
			
			view.trigger('dispose');

			var index = _.indexOf(this._views, view);
			if(index < 0){
				return null;
			}
			_.without(this._views, view);
			view.$el.remove();

			this.collection.remove(this.collection.at(index), {
				silent : true
			});

			// 
			view.trigger('disposed');
		},

		removeAll : function(){
			_.each(this._views, function(view){
				view.trigger('dispose')
				view.$el.remove();	
				view.trigger('disposed');
			})
			this._views = [];
			this.collection.reset();
		},

		findByType : function(type){
			
			var self = this;

			var result = [];

			function find(view){
				if(view._views){

					_.each(view._views, function(_view, index){
						//递归查找
						find(_view);
					})
				}

				if(type.toUpperCase() == view.type){
					result.push(view);
				}
			}
			find(this);

			return result;
		},

		findByName : function(name){

			var self = this;

			var result = null;

			function find(view){
				if(view._views){
					_.each(view._views, function(_view, index){
						find(_view);
					})
				}
				if(view.model){
					if(view.model.get('name') == name){
						result = view;
					}
				}
				else if(view.collection){
					if(view.collection.name == name){
						result = view;
					}
				}
			}
			find(this);

			return result;
		},

		setName : function(name){
			this.collection.name = name;
			this.$el.children('h5.lblend-layer-label').html(name);
		},

		hideLabel : function(){
			this.$el.children('h5').css({display:'none'});
		},

		showLabel : function(){
			this.$el.children('h5').css({display:'auto'})
		}

	})

	exports.Collection = Collection;

	exports.WrapperModel = WrapperModel;
	
	exports.View = View;

	Collection.prototype.__viewconstructor__ = View;
})

//=======================================
//Link.js
//节点连接线组件
//依赖Raphael来绘制连接线
//
//将source和target改成位置来降低耦合度
//=======================================

define("Core/UIBase/Link-debug", [], function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults:{
			source : {left:0, top:0},
			target : {left:0, top:0}
		}
	})

	var View = Backbone.View.extend({

		type : 'LINK',

		model : null,

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}

			this.model.on('change:source', function(){

				this._updatePath();
			}, this);

			this.model.on('change:target', function(){

				this._updatePath();
			}, this);

		},

		render : function(svg){
			var p1 = this.model.get('source') || {left : 0, top:0},
				p2 = this.model.get('target') || p1;

			this.el = svg.create('path');
			svg.attr(this.el, 'd', this._getPathString(p1, p2));
			// 默认颜色
			svg.attr(this.el, {
				'stroke' : '#c8c828',
				'stroke-width' : 2,
				'fill' : 'none'
			});
			// cache svg context
			this._svg = svg;

		},

		_updatePath : function(){
			if( ! this._svg){
				return;
			}
			var p1 = this.model.get('source') || {left : 0, top:0},
				p2 = this.model.get('target') || p1;

			this._svg.attr(this.el, 'd', this._getPathString(p1, p2));
		},

		_getPathString : function(p1, p2){

			var c1 = {left : p1.left+60, top : p1.top},
				c2 = {left : p2.left-60, top : p2.top};

			return _.template("M {{p1x}} {{p1y}} C {{c1x}} {{c1y}} {{c2x}} {{c2y}} {{p2x}} {{p2y}}",
						{
							p1x : p1.left,
							p1y : p1.top,
							c1x	: c1.left,
							c1y : c1.top,
							c2x : c2.left,
							c2y : c2.top,
							p2x : p2.left,
							p2y : p2.top				
						});
		},

		remove : function(){
			this.el.parentNode.removeChild(this.el);
		}
	})

	exports.View = View;

	exports.Model = Model;

	Model.prototype.__viewconstructor__ = View;
})

//============================================
// Node.js
// 节点编辑器的节点组件，继承自Layer组件，但是提供了更详细的样式和交互
// 依赖jquery ui提供拖拽的交互
// 关闭节点的触发close事件
// todo 加入resizable
//============================================

define("Core/UIBase/Node-debug", ["./Layer-debug"], function(require, exports, module){
	var Layer = require('./Layer-debug');

	var Collection = Layer.Collection.extend({
	});

	var View = Layer.View.extend({

		className : 'lblend-node',

		template : '<h5 class="lblend-node-label">{{label}}</h5><div class="lblend-list"></div><div class="lblend-close" title="close"></div>',

		collection : null,

		render : function(){

			var self = this;

			//调用父类的渲染程序
			Layer.View.prototype.render.call(this);

			//使用jquery ui提供拖拽的交互
			this.$el.draggable({
				// scroll : true,
				scrollSensitivity: 40,
				stack : '.lblend-node',
				scrollSpeed : 60,
				opacity: 0.5,
				handle : 'h5',
				cursor: "move",
				drag : function(){
					self.trigger('drag')
				},
				start : function(){
					self.trigger('dragstart')
				}
			});
			this.$el.css('position', 'absolute');

			this.cachePinViews();

			this.$el.find('.lblend-close').click(function(){
				self.trigger('close');
			})
		},
		//缓存InputPinView和OutputPinView
		cachePinViews : function(){

			this._inputPinViews = this.findByType('INPUTPIN');
			this._outputPinViews = this.findByType('OUTPUTPIN');
		},

		setName : function(name){
			this.collection.name = name;
			this.$el.find('h5.lblend-node-label').html(name);
		}
	});

	exports.Collection = Collection;

	exports.View = View;

	Collection.prototype.__viewconstructor__ = View;

})

//============================================
// Panel.js
//============================================

define("Core/UIBase/Panel-debug", ["./Layer-debug"], function(require, exports, module){

	var Layer = require('./Layer-debug');

	var Collection = Layer.Collection.extend({
	});

	var View = Layer.View.extend({

		type : 'PANEL',

		tagName : 'div',

		className : 'lblend-panel',

		template : '<h5 class="lblend-panel-label">{{label}}</h5><div class="lblend-list"></div>',

		collection : null,

		render : function(){

			var self = this;

			//调用父类的渲染程序
			Layer.View.prototype.render.call(this);

		},

		setName : function(name){
			this.collection.name = name;
			this.$el.find('h5.lblend-panel-label').html(name);
		}
	});

	exports.Collection = Collection;

	exports.View = View;

	Collection.prototype.__viewconstructor__ = View;

})

//=================
// Select.js
// 提供change事件
//=================
define("Core/UIBase/Select-debug", [], function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			name : '',	
			value : '', //这里name对应option的value
			html : '',	// 每个option的html
			selected : false
		}
	});

	var Collection = Backbone.Collection.extend({
		
		select : function(value){
			this.forEach(function(model){
				if(model.get('value') == value){
					model.set('selected', true);
				}else{
					model.set('selected', false);
				}
			})
		}
	})

	var View = Backbone.View.extend({

		type : 'SELECT',

		tagName : 'div',

		className : 'lblend-select',

		template : '<label class="lblend-select-label">{{label}}</label><a class="lblend-select-button lblend-common-button"></a>',

		collection : null,

		events : {
			'click .lblend-select-button' : 'toggle'
		},

		inSelect : false,

		initialize : function(){

			if( ! this.collection){
				this.collection = new Collection;
			}
			var self = this;

			this.collection.on('add', this.add, this);
			this.collection.on('change:selected', function(item, value){
				if( value ){
					
					this.trigger('change', item);		
				}
			}, this)

			this.on('disposed', function(){
				$('.lblend-select-dropdown-list').remove();
			})

			this.render();
		},

		render : function(){
			var self = this;
			this.$el.html(_.template(this.template, {
				label : this.collection.name || ''
			}));
			
		},

		add : function(model){
			if(this.collection.where({
				selected :true
			}).length == 0){
				this.select(model.get('value'));
			}
		},

		toggle : function(){
			if( this.inSelect){
				
				$('.lblend-select-dropdown-list').remove();
				this.inSelect = false;
			}else{

				var self = this;
				$('.lblend-select-dropdown-list').remove();
				
				$ul = $('<ul class="lblend-select-dropdown-list"></ul>');
				this.collection.forEach(function(model){
					$ul.append(self.createItem(model));
				});

				var $button = this.$el.find('.lblend-select-button'),
					offset = $button.offset();
				$(document.body).append($ul);
				$ul.css({
					'position' : 'absolute'
				})
				$ul.offset({
					left : offset.left,
					top : offset.top+$button.outerHeight()+3
				})
				
				this.inSelect = true;
			}
		},

		createItem : function(model){
			var self = this;
			var $li = $('<li></li>');
			$li.data('value', model.get('value'));
			$li.html(model.get('html'));
			$li.click(function(){
				self.select(model.get('value'));
				self.toggle();
			});
			if(model.get('selected')){
				$li.addClass('selected');
			}
			return $li;
		},

		setName : function(name){
			this.collection.name = name;
			this.$el.children('label.lblend-select-label').html(name);
		},

		select : function(value){

			this.collection.select(value);

			var $ul = $('.lblend-select-dropdown-list'),
				$lis = $ul.children('li'),
				self = this;

			$lis.removeClass('selected');
			$ul.children('li').each(function(){
				var $this = $(this);
				if( $this.data('value') == value ){
					$this.addClass('selected');
				}
			})
			
			var model = this.collection.where({
				value : value
			})[0];
			if(model){
				this.$el.find('.lblend-select-button').html(model.get('html'));
			}
		}
		
	})

	Collection.prototype.__viewconstructor__ = View;

	return {
		Collection : Collection,
		View : View
	}
})

//=======================================
//Texture.js
//纹理编辑组件
//=======================================

define("Core/UIBase/Texture-debug", ["./Float-debug"], function(require, exports, module){

	var Float = require('./Float-debug');

	var textureID = 0;

	var Model = Backbone.Model.extend({
		defaults : {
			name : '',
			path : 'none',	//文件位置
			texture : null	//THREE.Texture
		}
	});

	var View = Backbone.View.extend({

		type : 'TEXTURE',

		tagName : 'div',

		className : 'lblend-texture',

		template : '<label class="lblend-texture-label" data-html="model.name"></label><span class="lblend-texture-path" data-html="model.path"></span>',

		popupTemplate : '<div class="lblend-texture-popup"><div class="lblend-texture-popup-image"></div></div>',

		model : null,

		$popup : null,
		popup : null,

		textureID : 0,

		events : {
			'click .lblend-texture-path' : 'toggleImage'
		},
		
		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}
			this.textureID = textureID++;

			this.render();

			this.model.on('change:texture', function(model, value){
				this.updateTexture();
			}, this);

			this.on('dispose', function(){
				$('#texturepopup_'+this.textureID).remove();
			})
		},

		render : function(){

			this.$el.html( this.template );

			rivets.bind(this.$el, {model:this.model});

			this.$popup = $(this.popupTemplate);
			this.popup = this.$popup[0];

			this.$popup.attr('id', 'texturepopup_'+this.textureID);
			this.updateTexture();
		},

		toggleImage : function(){
			var $el = $('#texturepopup_'+this.textureID);
			if( $el.length ){
				$el.remove();
			}
			else{
				var offset = this.$el.offset();

				this.$popup.css({
					left : offset.left+20,
					top : offset.top+this.$el.height()+5
				})
				$(document.body).append(this.$popup);
			}

		},

		updateTexture : function(){
			var $el = this.$popup.find('.lblend-texture-popup-image')
			$el.find('img').remove();
			if(this.model.get('texture')){
				$el.append(this.model.get('texture').image)
			}
			else{
				$el.append('<img class="lblend-texture-default" />');
			}
		},


	})

	exports.View = View;

	exports.Model = Model;

	Model.prototype.__viewconstructor__ = View;
})

//=====================
// Tree.js
// tree view
//=====================
define("Core/UIBase/Tree-debug", [], function(require, exports, module){


	var treeInstances = [];
	// data structure
	// + type : 		file|folder
	// + name : ""
	// + icon : "" 		icon class
	// + owner
	// + children : []	if type is folder
	// + dataSource 	asset path or scene node json data
	// + dataType 		type of binded asset or node
	//
	// dataSource and dataType is maily for the dataTransfer
	var Model = Backbone.Model.extend({
		defaults : {
			json : []
		}
	});

	var File = function(name){

		this.type = 'file';
		this.name = name;
		this.owner = "";

		this.acceptConfig = {};

		this.$el = null;
	}

	_.extend(File.prototype, Backbone.Events);

	File.prototype.getRoot = function(){
		var root = this;
		while(root.parent){
			root = root.parent;
		}
		return root;
	}
	File.prototype.genElement = function(){

		var html = _.template('<li class="lblend-tree-file">\
						<span class="lblend-tree-title" draggable="true">\
							<span class="lblend-tree-icon"></span>\
							<a>{{name}}</a>\
						</span>\
					</li>', {
						name : this.name
					})
		var $el = $(html);
		if(_.isString(this.icon)){
			$el.find('.lblend-tree-icon').addClass(this.icon);
		}else{
			// an image or something else
			$el.find('.lblend-tree-icon').append(this.icon);
		}

		this.$el = $el;

		$el.data('path', this.getPath() );

		var self = this;

		// draggable
		$el[0].addEventListener('dragstart', function(e){

			e.stopPropagation();

			e.dataTransfer.setData('text/plain', JSON.stringify(self.toJSON()) )
		}, false)

		return $el;
	}
	File.prototype.select = function(silent){
		this.$el.addClass('active');

		if( ! silent){
			this.getRoot().trigger('selected:node', this);
		}
		
	}
	File.prototype.unselect = function(){
		if( this.$el.hasClass('active') ){
			this.$el.removeClass('active');
			this.getRoot().trigger('unselected:node', this);
		}
	}
	File.prototype.getPath = function(){
		if( ! this.parent ){
			return this.name;
		}
		return this.parent.getPath() + this.name;
	}
	File.prototype.setName = function(name, silent){
		
		if( ! silent){
			this.getRoot().trigger('updated:name', this, name);
		}

		this.name = name;

		if( this.$el ){
			this.$el.children('.lblend-tree-title').find('a').html( name );
		}
		//update data
		this.$el.data('path', this.getPath());

	}
	File.prototype.toJSON = function(){
		var item = {
			type : this.type,
			name : this.name,
			path : this.getPath(),
			icon : this.icon,
			owner : this.owner,
			dataSource : _.isFunction(this.dataSource) ? this.dataSource() : this.dataSource,
			dataType : this.dataType
		}

		return item;
	}

	var Folder = function(name){

		this.name = name;
		this.type = 'folder';

		this.owner = '';	//distinguish different trees

		this.children = [];

		this.$el = null;
		this.$sub = null;

		// config to verify if this folder can accept
		// any transferred data
		this.acceptConfig = {
			'default' : {
				// an verify function
				accept : function(json){
					if( ! (json instanceof FileList) ){
						if( json.owner == this.owner ){
							return true;
						}
					}
				},
				// action after verify succeed
				accepted : function(json){
					// default action after target is dropped and accepted
					// move an other node to the folder
					var node = this.getRoot().find(json.path);

					if( node){
						if( node.parent != self ){
							this.add(node);
						}
					}
				}

			}
		}
	}

	_.extend(Folder.prototype, Backbone.Events);

	Folder.prototype.setName = function(name, silent){

		if( ! silent){
			this.getRoot().trigger('updated:name', this, name);
		}

		this.name = name;
		if( this.$el ){
			this.$el.children('.lblend-tree-title').find('a').html( name );
		}

		//update data
		this.$el.data('path', this.getPath());
	}
	Folder.prototype.getRoot = function(){
		var root = this;
		while(root.parent){
			root = root.parent;
		}
		return root;
	}
	Folder.prototype.add = function(node, silent){
		var isMove = false;
		if(node.parent){
			isMove = true;
			var parentPrev = node.parent;

			if(node.parent == this){
				return;
			}
			node.parent.remove(node, true);
		}
		this.children.push( node );

		node.parent = this;
		// add element
		this.$sub.append( node.genElement() );

		node.owner = this.owner;

		if( ! silent){
			if( isMove ){
				this.getRoot().trigger('moved:node', this, parentPrev, node);
			}else{
				this.getRoot().trigger('added:node', this, node);
			}
		}
	}
	Folder.prototype.remove = function(node, silent){
		if( _.isString(node) ){
			node = this.find(node);
		}
		// call before the node is really removed
		// because we still need to get node path in the event handler
		if( ! this.silent){

			this.getRoot().trigger('removed:node', this, node);
		}

		node.parent = null;
		_.without( this.children, node);
		// remove element
		node.$el.remove();

	}
	Folder.prototype.getPath = function(){
		if( ! this.parent ){
			return this.name + '/';
		}
		return this.parent.getPath() + this.name + '/';
	}
	Folder.prototype.genElement = function(){

		var html = _.template('<li class="lblend-tree-folder">\
						<span class="lblend-tree-title" draggable="true">\
							<span class="lblend-tree-icon"></span>\
							<a>{{name}}</a>\
						</span>\
						<ul>\
						</ul>\
					</li>', {
						name : this.name
					})

		var $el = $(html),
			$ul = $el.children('ul');

		if(_.isString(this.icon)){
			$el.find('.lblend-tree-icon').addClass(this.icon);
		}else{
			// an image or something else
			$el.find('.lblend-tree-icon').append(this.icon);
		}

		$el.data('path', this.getPath());

		var self = this;
		_.each(this.children, function(child){
			$ul.append( child.genElement() );
		})

		// draggable
		$el[0].addEventListener('dragstart', function(e){

			e.stopPropagation();

			e.dataTransfer.setData('text/plain', JSON.stringify(self.toJSON()) )
		}, false)

		this.$el = $el;
		this.$sub = $ul;

		return $el;
	}

	// default accept judgement

	Folder.prototype.accept = function(accept, accepted){
		this.acceptConfig.push({
			accept : accepted
		})
	}

	Folder.prototype.select = function(silent){
		this.$el.addClass('active');
		this.selected = true;

		if( ! silent){
			this.getRoot().trigger('selected:node', this);
		}
		
	}

	Folder.prototype.unselect = function(){
		if( this.$el.hasClass('active') ){
			this.$el.removeClass('active');
			this.selected = false;
			this.getRoot().trigger('unselected:node', this);
		}
	}

	Folder.prototype.toggleCollapase = function(){
		this.$el.toggleClass('collapse');
	}

	Folder.prototype.traverse = function(callback){
		callback( this );
		_.each( this.children, function(child){
			if( ! child.traverse){	// is a file
				callback( child );
			}else{
				child.traverse( callback );
			}
		} )
	}

	// find a folder or file 
	Folder.prototype.find = function(path){

		var root = this;
		// abosolute path
		if( path.charAt(0) == '/'){
			path = path.substring(1);
			root = this.getRoot();
		}
		
		return _.reduce(_.compact(path.split('/')), function(node, name){
			if( ! node){
				return;
			}
			if( name == '..'){
				return node.parent;
			}
			else if( !name || name =='.'){
				return node;	
			}
			else{
				return _.find(node.children, function(item){
					return item.name==name
				});
			}
		}, root);
	}

	Folder.prototype.createFromJSON = function(json){
		
		var self = this;

		json = _.isArray(json) ? json : [json];

		_.each(json, function(item){

			if( item.type == 'folder'){

				var folder = new Folder(item.name);

				folder.icon = item.icon;
				folder.dataSource = item.dataSource;
				folder.dataType = item.dataType;

				self.add(folder);

				_.each(item.children, function(child){

					folder.createFromJSON(child);
				})
			}
			else if( item.type == 'file' ){

				var file = new File(item.name);

				file.icon = item.icon;
				file.source = item.source;
				file.targetType = item.targetType;

				self.add(file);
			}
		})
	}

	Folder.prototype.toJSON = function(){
		var item = {
			type : this.type,
			name : this.name,
			path : this.getPath(),
			icon : this.icon,
			owner : this.owner,
			dataSource : _.isFunction(this.dataSource) ? this.dataSource() : this.dataSource,
			dataType : this.dataType,
			children : []
		}

		_.each(this.children, function(child){
			item.children.push( child.toJSON() );
		})
		return item;
	}

	Folder.prototype.createFolder = function(path, silent){
		path = _.compact(path.split('/'));
		var ret = _.reduce(path, function(node, name){
			var folder = node.find(name);
			if( !folder ){
				folder = new Folder(name);
				node.add( folder, silent );
			}
			return folder;
		}, this);

		if( ! silent){

			this.getRoot().trigger('created:folder', this, ret);
		}
		return ret;
	}
	Folder.prototype.createFile = function(path, silent){
		dir = _.compact(path.split('/'));
		var fileName = dir.pop();
		var folder = this.createFolder(dir.join('/'));
		var file = folder.find(fileName);
		if( ! file){
			file = new File( fileName );
			folder.add( file, silent );

			if( ! silent){
				this.getRoot().trigger('created:file', this, file);
			}
		}

		return file;
	}

	var Root = function(){
		Folder.call(this);
		this.name = '/';
	};
	Root.prototype = new Folder;
	Root.prototype.getPath = function(){
		return '/';
	}
	Root.prototype.genElement = function(){

		var $el = $('<div class="lblend-tree-root">\
						<ul></ul>\
					</div>');
		var $ul = $el.find('ul');
		this.$sub = $ul;
		this.$el = $el;
		
		_.each(this.children, function(child){
			$ul.append( child.genElement() );
		})

		return $el;
	}

	var View = Backbone.View.extend({

		type : 'THREE',

		className : 'lblend-tree',

		tagName : 'div',

		root : null,

		events : {
			'dragenter li' : 'dragenterHandler',
			'dragleave li' : 'dragleaveHandler',
			'drop li' : 'dropHandler',
			'click .lblend-tree-title' : 'clickTitleHanlder'
		},

		initialize : function(){
			var self =this;

			if( ! this.model ){
				this.model = new Model;
			};
			if( ! this.root ){
				this.root = new Root;
			}
			this.model.on('change:json', function(){
				this.render();
			}, this);
			this.root.on('all', function(){
				this.trigger.apply(this, arguments);
			}, this);

			this.render();

			this._dragenter = [];
			this._dragleave = [];
			this._drop = [];
			// folder and file drag in the same tree
			this.drop(function(json, e){
				
				var node = self.find($(this).data('path'));
				
				_.each(node.acceptConfig, function(config){
					if( config.accept.call(node, json) ){
						config.accepted.call(node, json);
					}
				})
			})

			// !! if the treeview is not used anymore 
			// must trigger disposed event manually
			treeInstances.push(this);
			this.on('disposed', function(){
				_.without(treeInstances, self);
			})
		},

		render : function(){

			this.root.createFromJSON( this.model.get('json') );

			this.$el.html('');
			this.$el.append( this.root.genElement() );

		},

		clickTitleHanlder : function(e){
			var $li = $(e.currentTarget).parent();
			var path = $li.data('path');
			var node = this.find(path);
			node.select();

			if( ! e.shiftKey){
				this.root.traverse(function(_node){
					_node.unselect();
				})
			}
			node.select();
			if(node.type == 'folder'){

				node.toggleCollapase();
			}
			// node click event
			this.trigger('click:node', node);
		},

		find : function(path){
			return this.root.find(path);
		},

		remove : function(path, silent){
			var node = this.find(path);
			if(node){
				node.parent.remove(node, silent);
			}
		},

		select : function(path, multiple, silent){
			if( ! multiple){
				this.root.traverse(function(node){
					node.unselect();
				})
			}
			this.root.find(path).select(silent);
		},

		_dragenter : [],

		_dragleave : [],

		_drop : [],

		dragenterHandler : function(e){
			e.stopPropagation();
			e.preventDefault();

			$(e.currentTarget).addClass('lblend-tree-dragover');

			_.each(this._dragenter, function(func){
				func.call(e.currentTarget, e);
			})
		},

		dragleaveHandler : function(e){
			e.stopPropagation();
			e.preventDefault();

			$(e.currentTarget).removeClass('lblend-tree-dragover');

			var self = this;
			_.each(this._dragleave, function(func){
				func.call(e.currentTarget, e);
			})
		},

		dropHandler : function(e){
			e.stopPropagation();
			e.preventDefault();

			$(e.currentTarget).removeClass('lblend-tree-dragover');

			var data;
			if(e.dataTransfer.files.length){
				// data from native files
				data = e.dataTransfer.files;
			}else{
				data = JSON.parse(e.dataTransfer.getData('text/plain'));
			}
			_.each(this._drop, function(func){
				func.call(e.currentTarget, data, e);
			})
		},

		drop : function(drop, dragenter, dragleave){
			
			if( drop ){
				this._drop.push(drop);
			}
			if( dragenter ){
				this._dragenter.push(dragenter);
			}
			if( dragleave ){
				this._dragleave.push(dragleave);
			}
		}

	})


	Model.prototype.__viewconstructor__ = View;

	exports.Model = Model;

	exports.View = View;

	exports.File = File;

	exports.Folder = Folder;

	exports.Root = Root;
})

//===============================================
// Vector.js
// 多个Float组件组成的向量编辑组件，尽管用collection作数据源，但是像Float一样也是一个原子组件
//===============================================

define("Core/UIBase/Vector-debug", ["./Float-debug"], function(require, exports, module){

	var Float = require('./Float-debug');

	//
	//Float.Model的collection集合，需要自己定义label或name属性，
	//name属性是该组件的标识符，再有父组件做管理的时候作为唯一标识符
	//label属性是该组件的显示名称
	//
	var Collection = Backbone.Collection.extend({
		name : '',
		model : Float.Model
	})

	var View = Backbone.View.extend({

		type : 'VECTOR',

		tagName : 'div',

		className : 'lblend-vector',

		collection : null,

		labelTemplate : '<label class="lblend-vector-label">{{label}}</label><div class="lblend-list"></div>',

		initialize : function(){
			if(! this.collection){
				this.collection = new Collection;
			}
			var self = this;
			this.collection.on('add', function(model){
				var view = new Float.View({
					model : model
				});
				self.$el.children('.lblend-list').append(view.$el);
			})

			this.render();
		},

		render : function(){
			
			var self = this;

			self.el.innerHTML = _.template(this.labelTemplate, {

				label : this.collection.label || this.collection.name || ''
			});
			
			var $list = self.$el.children('.lblend-list');

			//创建并且渲染Float组件
			self.collection.forEach(function(model, index){
				
				var view = new Float.View({
					model : model
				});
				view.render();
				$list.append(view.$el);
			})
		},
		// 因为Vector是使用collection，所以不能观察name的变化
		// 这里只能加一个setName方法设置，不知道有木有更好的办法
		setName : function(name){
			this.collection.name = name;
			this.$el.find('label.lblend-vector-label').html(name);
		}
	})

	exports.Collection = Collection;

	exports.View = View;

	Collection.prototype.__viewconstructor__ = View;
})

//============================================
//Video.js
//视频编辑组件
//============================================

define("Core/UIBase/Video-debug", [], function(require, exports, module){


	var Model = Backbone.Model.extend({

		defaults : {
			name : '',
			video : null	//VideoDomElement
		}
	});

	var View = Backbone.View.extend({

		type : 'VIDEO',

		model : null,

		tagName : 'div',

		className : 'lblend-video',

		template : '<label>{{label}}</label><br />',

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}

			this.model.on('change:video', function(){

				if(this.el){

					this.$el.find('video').remove();
					if( this.model.get('video')){

						this.el.appendChild(this.model.get('video'));
					}else{

						this.$el.append('<video class="lblend-video-default" />');
					}
				}
			}, this);

			this.model.on('change:name', function(){
				this.$el.find('label').html(this.model.get('name'));
			}, this)
			
			this.render();
		},

		render : function(){

			this.el.innerHTML = _.template(this.template, {
				label : this.model.get('name') || ''
			});
			if(this.model.get('video')){
				this.el.appendChild(this.model.get('video'));
			}else{

				this.$el.append('<video class="lblend-video-default" />');
			}
		}
	})

	exports.Model = Model;

	exports.View = View;

	Model.prototype.__viewconstructor__ = View;
})

//=========================
// Tab.js
//=========================
define("Core/UIBase/Tab-debug", ["./Layer-debug"], function(require, exports){

	var Layer = require('./Layer-debug');

	var Collection = Layer.Collection.extend({});

	var View = Backbone.View.extend({

		type : 'TAB',

		className : 'lblend-tab',

		template : '<ul class="lblend-tab-tabs"></ul><div class="lblend-list"></div>',

		tabs : null,

		initialize : function(){

			var self = this;
			// name active view
			this.tabs = new Backbone.Collection;

			this.tabs.on('add', function(tab){
				
				self.renderTabs();

				tab.on('change:active', function(){
					if(tab.get('active')){
						tab.get('$el').addClass('active');
						tab.get('view').$el.css('display', 'block');
					}else{
						tab.get('$el').removeClass('active');
						tab.get('view').$el.css('display', 'none');
					}
				})

				self.tabs.forEach(function(_tab){
					_tab.set('active', false);
				})
				tab.set('active', true);
			})

			this.tabs.on('remove', function(tab){
				self.renderTabs();
			})

			Layer.View.prototype.initialize.call(this)
		},

		render : function(){

			Layer.View.prototype.render.call(this);

			this.renderTabs();
		},

		renderTabs : function(){
			var self = this;
			var $tabs = this.$el.children('.lblend-tab-tabs');
			$tabs.html('');
			this.tabs.forEach(function(tab){

				var $el = $('<li>'+tab.get('name')+'</li>');
				$el.click(function(){
					self.active(tab.get('name'));
				})
				$tabs.append($el);
				tab.set('$el', $el);

			})
		},

		_addModel : function(model){

			Layer.View.prototype._addModel.call(this, model);

			var view = _.last(this._views);

			view.hideLabel();

			var name = getModelName(model);

			this.tabs.add({
				name : name,
				active : false,
				// 该标签对应的view
				view : view
			})
		},

		_removeModel : function(model){

			Layer.View.prototype._removeModel.call(this, model);

			var name = getModelName(model);

			this.tabs.remove(this.tabs.where({
				name : name
			})[0]);
		},

		appendView : function(view){

			Layer.View.prototype.appendView.call(this, view);

			var name = getViewName(view);

			this.tabs.add({
				name : name,
				active : false,
				// 该标签对应的view
				view : view,
				// 该标签的dom
				$el : $('<li>'+name+'</li>')
			})
		},

		removeView : function(view){

			Layer.View.prototype.removeView.call(this, view);
		},

		active : function(tabName){
			var activeView;
			this.tabs.forEach(function(tab){
				if(tab.get('name') == tabName){
					tab.set('active', true);
					activeView = tab.get('view');
				}else{
					tab.set('active', false);
				}
			});
			if(activeView && activeView.getMenuConfigs){

			}
		}

	})

	// 判断是WrapperModel还是其它Model，并且获取其名字
	var	getModelName = function(model){
		var name;
		if(model instanceof Layer.WrapperModel){
			var coll = model.get('collection');
			name = coll.name;
		}else{
			name = model.get('name');
		}
		return name;
	}

	var getViewName = function(view){
		if(view.collection){
			return view.collection.name
		}else{
			return view.model.get('name')
		}
	}

	exports.Collection = Collection;

	exports.View = View;

	Collection.prototype.__viewconstructor__ = View;
})

//==========================================
//index.js
//加载当前目录下的所有组件
//==========================================
define("Core/UIBase/Mixin/index-debug", ["./Collapsable-debug", "./Scrollable-debug", "./InputPin-debug", "./Pin-debug", "./OutputPin-debug"], function(require, exports, module){

	exports.Collapsable = require('./Collapsable-debug');
	exports.Scrollable 	= require('./Scrollable-debug');
	exports.InputPin 	= require('./InputPin-debug');
	exports.OutputPin 	= require('./OutputPin-debug');
	exports.Pin 		= require('./Pin-debug');

})


//=====================
// Collapsable.js
// 可以折叠，主要针对LayerView
//=====================
define("Core/UIBase/Mixin/Collapsable-debug", [], function(require, exports, module){

	exports.applyTo = function(view){

		var self = this;
		if( ! view.mixin){
			view.mixin = [];
		}
		if(_.indexOf(view.mixin, self.tag) > 0){
			return;
		}
		view.mixin.push(self.tag);

		// 展开折叠的按钮
		var $button = $(_.template('<div class="{{className}}"></div>"', {
				className : self.className
			}));

		function update(){
			var $label = view.$el.children('h5');
			if( ! $label.length){
				$label = view.$el.children('label');
			}
			if($label.css('position') != 'absolute'){
				$label.css('position', 'relative');
			}
			$label.append($button);
			$label.css('padding-left', '20px');

			$label.bind('click', view.toggle);
			$button.addClass(view.collapase ? 'fold' : 'unfold');

			var $list = view.$el.children('.lblend-list');
			$list.css({
				'overflow-y':'hidden'
			})
		}

		// 保存原先的render函数
		var renderPrev = view.render;
		_.extend(view, {

			collapse : false,

			render : function(){
				renderPrev.call(view);

				update();

			},

			toggle : function(){
				if( view.collapase){
					view.unfold();
				}
				else{
					view.fold();
				}
			},

			fold : function(){
				this.$el.find('.lblend-list').slideUp();
				$button.removeClass('unfold');
				$button.addClass('fold');
				this.collapase = true;
			},

			unfold : function(){
				this.$el.find('.lblend-list').slideDown();
				$button.addClass('unfold');
				$button.removeClass('fold');
				this.collapase = false;
			},

			back : function(){
				var $label = view.$el.children('label');
				$button.remove();
				view.render = renderPrev;
				delete view.collapse;
				delete view.toggle;
				delete view.fold;
				delete view.unfold;
			}

		})

		update();

	}

	exports.className = 'lblend-collapsable';

	exports.tag = 'COLLAPSABLE'
})

//=====================
// Scrollable.js
// 自定义滚动，主要针对LayerView, 滚动的时候LayerView中的label不动,改变list的top值
// todo 加入滚轮的scroll
//=====================
define("Core/UIBase/Mixin/Scrollable-debug", [], function(require, exports, module){

	exports.applyTo = function(view){

		var self = this;
		if( ! view.mixin){
			view.mixin = [];
		}
		if(_.indexOf(view.mixin, self.tag) > 0){
			return;
		}
		view.mixin.push(self.tag);

		var $scrollbarX = $('<div class="lblend-scrollbar-x"><div class="lblend-scrollbar-thumb"></div></div>'),
			$scrollbarY = $('<div class="lblend-scrollbar-y"><div class="lblend-scrollbar-thumb"></div></div>'),
			$scrollbarXThumb = $scrollbarX.find('.lblend-scrollbar-thumb'),
			$scrollbarYThumb = $scrollbarY.find('.lblend-scrollbar-thumb');

		$scrollbarX.mousewheel(function(e, delta){
			e.stopPropagation();
			stepX(delta*20);
		})
		
		$scrollbarY.mousewheel(function(e, delta){
			e.stopPropagation();
			stepY(delta*20);
		})
		
		var renderPrev = view.render;

		// listOriginPosition是list原先的位置
		var $list, $label, listOriginPosition;
		// clientWidth, clientHeight是显示的大小
		// overviewWidth, overviewHeight是文档实际的大小
		var percentX, percentY, clientWidth, clientHeight, overviewWidth, overviewHeight;

		$scrollbarXThumb.draggable({
			'axis' : 'x',
			'containment' : 'parent',
			'drag' : function(e, ui){
				var left = ui.position.left,
					thumbWidth = $scrollbarXThumb.width(),
					barWidth = $scrollbarX.width();

				if( barWidth > thumbWidth){
					var percent = left / ( barWidth - thumbWidth);

					updateOverviewXPercent(percent);
				}
			}
		});
		$scrollbarYThumb.draggable({
			'axis' : 'y',
			'containment' : 'parent',
			'drag' : function(e, ui){
				var top = ui.position.top,
					thumbHeight = $scrollbarYThumb.height(),
					barHeight = $scrollbarY.height();

				if( barHeight > thumbHeight){
					var percent = top / ( barHeight - thumbHeight);

					updateOverviewYPercent(percent);
				}
			}
		});

		var monitorInstance;

		view.on('dispose', function(){
			if( monitorInstance ){
				clearInterval(monitorInstance);
			}
		})
		function render(){
			view.$el.css('overflow', 'hidden');

			$list = view.$el.children('.lblend-list');
			$label = view.$el.children('h5');
			
			listOriginPosition = {
				top : $list.position().top,
				left : $list.position().left
			}
			//todo 在$el有padding的时候为什么position的left和top还都是0？

			view.$el.append($scrollbarX);
			view.$el.append($scrollbarY);

			if( monitorInstance ){
				clearInterval( monitorInstance );
			}
			// 有没有别的更好的办法 ?
			setInterval(function(){	
				update();
			}, 500);

			view.$el.mousewheel(function(e, delta){
				stepY(delta*20);
			})
		}

		function update(){

			clientHeight = view.$el.height() - listOriginPosition.top;
			clientWidth = view.$el.width();

			overviewWidth = $list.width();
			overviewHeight = $list.height();

			percentX = clientWidth / overviewWidth;
			percentY = clientHeight / overviewHeight;

			if( percentX >= 1){
				$scrollbarX.css('display', 'none');
			}
			else{
				$scrollbarX.css('display', 'block');
				$scrollbarXThumb.width( percentX * view.$el.width() );
			}
			if( percentY >= 1){
				$scrollbarY.css('display', 'none');
			}else{
				$scrollbarY.css('display', 'block');
				$scrollbarYThumb.height( percentY * view.$el.height() );
			}

		}

		// y方向上滚动一定距离
		function stepY(step){
			var top = $list.position().top+step,
				percent = Math.abs( top/(overviewHeight-clientHeight) );

			if( top >= listOriginPosition.top ){
				percent = 0;
			}
			if( percent >= 1){
				percent = 1;
			}
			updateScrollbarYPercent(percent);
			updateOverviewYPercent(percent);
		}

		function stepX(step){
			var left = $list.position().left+step,
				percent = Math.abs( left/(overviewWidth-clientWidth) );

			if( left >= listOriginPosition.left){
				left = listOriginPosition.left;
				percent = Math.abs( left/(overviewWidth-clientWidth) );
			}
			if( percent >= 1){
				percent = 1;
			}
			updateScrollbarXPercent(percent);
			updateOverviewXPercent(percent);
		}

		function updateScrollbarYPercent(percent){

			var thumbHeight = $scrollbarYThumb.height(),
				barHeight = $scrollbarY.height();
			var thumbTop = (barHeight-thumbHeight)*percent;
			$scrollbarYThumb.css('top', thumbTop);
		}

		function updateOverviewYPercent(percent){
			var offsetTop = (overviewHeight - clientHeight) * percent,
				parentTop = view.$el.offset().top;

			$list.offset({
				'top': -offsetTop+listOriginPosition.top+parentTop
			});
		}

		function updateScrollbarXPercent(percent){

			var thumbWidth = $scrollbarXThumb.width(),
				barWidth = $scrollbarX.width();
			var thumbLeft = (barWidth-thumbWidth)*percent;
			$scrollbarXThumb.css('left', thumbLeft);
		}

		function updateOverviewXPercent(percent){
			var offsetLeft = (overviewWidth - clientWidth) * percent,
				parentLeft = view.$el.offset().left;

			$list.offset({
				'left': -offsetLeft+listOriginPosition.left+parentLeft
			});
		}

		_.extend(view, {

			render : function(){

				renderPrev.call(this);

				render();
			},

			back : function(){

			},

			scrollTo : scrollTo
		})

		render();
	}

	exports.className = 'lblend-scrollable';

	exports.tag = 'SCROLLABLE';

})

//=================================
// InputPin.js
//=================================
define("Core/UIBase/Mixin/InputPin-debug", ["./Pin-debug"], function(require, exports, module){

	var Pin = require('./Pin-debug');

	_.extend(exports, {
		className : 'lblend-pin-input',
		tag : 'INPUTPIN'
	})

	_.defaults(exports, Pin);
})

//=================================
// Pin.js
// 为一些参数组件中添加一个端口
//=================================
define("Core/UIBase/Mixin/Pin-debug", [], function(require, exports, module){

	exports.applyTo = function(view){

		var self = this;
		// 加上mixin的tag，预防冲突，也方便查找
		if( ! view.mixin){
			view.mixin = [];
		}
		if(_.indexOf(view.mixin, self.tag) >= 0){
			return;
		}
		view.mixin.push(self.tag);
		
		var $pin;

		function init(){

			$pin = $(_.template('<div class="{{className}}"></div>' , {
				
				className : self.className
			}));
		}
		// 插入dom
		function update(){

			if(view.$el.css('position') != 'absolute'){

				view.$el.css('position', 'relative');
			}
			
			view.$el.append($pin);
		}

		init();
		update();

		// 保存原先的render函数
		var renderPrev = view.render;
		_.extend(view, {

			$pin : $pin,
			// 每次render 的时候重新插入dom
			render : function(){
				// 
				renderPrev.call(view);
				
				update()
			},
			// 获取pin的位置
			getPosition : function(pOffset){

				var	offset = $pin.offset(),
					pOffset = pOffset || {left : 0, top : 0},
					width = $pin.width(),
					height = $pin.height();

				return {
					left : offset.left - pOffset.left + width/2,
					top : offset.top - pOffset.top + height/2
				}
			},
			// 移除这个mixin
			back : function(){
				delete this.$pin;
				delete this.getPosition;
				//删除pin
				$pin.remove();
				view.render = renderPrev;
			}
		})
	}

	exports.className = 'lblend-pin';

	exports.tag = 'PIN';
})

//=================================
// OutputPin.js
//=================================
define("Core/UIBase/Mixin/OutputPin-debug", ["./Pin-debug"], function(require, exports, module){

	var Pin = require('./Pin-debug');

	_.extend(exports, {
		className : 'lblend-pin-output',
		tag : 'OUTPUTPIN'
	})

	_.defaults(exports, Pin);
})

define("Core/Helpers/index-debug", ["./Boundingbox-debug", "./Camera-debug", "./Light-debug", "./Manipulator-debug", "../MouseEventDispatcher-debug", "../Assets/Util-debug", "./Scene-debug", "./Wireframe-debug"], function(require, exports){

	exports.Boundingbox	= require('./Boundingbox-debug');
	exports.Camera		= require('./Camera-debug');
	exports.Lights		= require('./Light-debug');
	exports.Manipulator	= require('./Manipulator-debug');
	exports.Scene		= require('./Scene-debug');
	exports.Wireframe	= require('./Wireframe-debug');

})

define("Core/Helpers/Boundingbox-debug", [], function(require, exports, module){

})

define("Core/Helpers/Camera-debug", [], function(require, exports, module){

})

define("Core/Helpers/Light-debug", [], function(require, exports, module){

})

//=================
// Manipulator.js
//=================
define("Core/Helpers/Manipulator-debug", ["../MouseEventDispatcher-debug", "../Assets/Util-debug"], function(require, exports, module){

	var scene;
	var MouseEventDispatcher = require('../MouseEventDispatcher-debug');

	var mode,
		helperContainer,
		helpers = {
			move : null,
			// rotate : null,
			// scale : null
		},

		renderer,
		camera,

		mouseEventDispatcher;

	var instance;

	function getInstance(renderer, camera){

		// change renderer and camera
		renderer = renderer;
		camera = camera;

		if( instance ){

			return instance;
		}

		scene = new THREE.Scene();

		helperContainer = new THREE.Object3D(),
		helpers['move'] = new PositionHelper(),
		// helpers['rotate'] = new RotationHelper(),
		// helpers['scale'] = new ScaleHelper();

		helperContainer.add(helpers['move']);
		// helperContainer.add(helpers['rotate']);
		// helperContainer.add(helpers['scale']);

		scene.add(helperContainer)
		var dLight = new THREE.DirectionalLight(0xffffff);
		dLight.position.set(1, 1, 0);
		scene.add(dLight);

		mouseEventDispatcher = MouseEventDispatcher.create( scene, camera, renderer, false);
		mouseEventDispatcher.updateScene();
		handleInteraction();

		var	target = null;

		function updatePosition(){

			helperContainer.position.set(0, 0, 0);
			target.localToWorld( helperContainer.position );

		}

		instance = {

			useMode : function(_mode){
				mode = _mode.toLowerCase();
				_.each(helpers, function(helper){
					helper.visible = false;
				})
				helpers[mode].visible = true;
			},

			bind : function(object){

				target = object;

				object.off('updated:position', updatePosition);
				object.on('updated:position', updatePosition, object);
			},

			render : function(renderer, camera){

				renderer.render( scene, camera );

			},

			setRenderer : function(_renderer){
				renderer = _renderer;
			},

			setCamera : function(_camera){
				camera = _camera;
			}
		}

		instance.useMode( 'move' );

		return instance;
	}

	function handleInteraction(){

		var axisX = helpers['move'].getChildByName('axis-x');
		axisX.on('mousedown', function(e){
			
		})

	}

	// for move manipulation
	var PositionHelper = function () {

		THREE.Object3D.call( this );

		var lineGeometry = new THREE.Geometry();
		lineGeometry.vertices.push( new THREE.Vector3() );
		lineGeometry.vertices.push( new THREE.Vector3( 0, 10, 0 ) );

		var coneGeometry = new THREE.CylinderGeometry( 0, 0.5, 2.0, 5, 1 );

		var xAxis = new THREE.Object3D();
		xAxis.name = 'axis-x';
		xAxis.rotation.z = -Math.PI/2;
		var line = new THREE.Line( lineGeometry, new THREE.LineBasicMaterial( { color : 0xff0000 } ) );
		var cone = new THREE.Mesh( coneGeometry, new THREE.MeshPhongMaterial( { color : 0xff0000 } ) );
		cone.enablepicking = true;
		cone.position.y = 10;
		xAxis.add( line );
		xAxis.add( cone );

		var yAxis = new THREE.Object3D();
		yAxis.name = 'axis-y';
		var line = new THREE.Line( lineGeometry, new THREE.LineBasicMaterial( { color : 0x00ff00 } ) );
		var cone = new THREE.Mesh( coneGeometry, new THREE.MeshPhongMaterial( { color : 0x00ff00 } ) );
		cone.enablepicking = true;		
		cone.position.y = 10;
		yAxis.add( line );
		yAxis.add( cone );

		var zAxis = new THREE.Object3D();
		zAxis.name = 'axis-z';
		zAxis.rotation.x = -Math.PI/2;
		var line = new THREE.Line( lineGeometry, new THREE.LineBasicMaterial( { color : 0x0000ff } ) );
		var cone = new THREE.Mesh( coneGeometry, new THREE.MeshPhongMaterial( { color : 0x0000ff } ) );
		cone.enablepicking = true;
		cone.position.y = 10;
		zAxis.add( line );
		zAxis.add( cone );

		this.add(xAxis);
		this.add(yAxis);
		this.add(zAxis);

	};
	PositionHelper.prototype = Object.create( THREE.Object3D.prototype );

	// for rotate manipulation
	var RotationHelper = function(){

	}
	RotationHelper.prototype = Object.create( THREE.Object3D.prototype );

	// for scale manipulation
	var ScaleHelper = function(){

	}
	ScaleHelper.prototype = Object.create( THREE.Object3D.prototype );

	exports.getInstance = getInstance;
})


define("Core/Helpers/Scene-debug", [], function(require, exports, module){

})

define("Core/Helpers/Wireframe-debug", [], function(require, exports, module){

})

//==========================================
//index.js
//加载当前目录下的所有组件
//==========================================
define("Core/index-debug", ["./Hub-debug", "./svg-debug", "./MouseEventDispatcher-debug", "./Assets/Util-debug", "./Assets/index-debug", "./Assets/Geometry-debug", "./Assets/Material-debug", "./Assets/Shader-debug", "./Assets/FileSystem-debug", "./Assets/Prefab-debug", "./Assets/Texture-debug", "./Assets/TextureCube-debug", "./Assets/Importer/index-debug", "./Assets/Importer/Binary-debug", "./Assets/Importer/Collada-debug", "./Assets/Importer/JSON-debug", "./Assets/Importer/Zip-debug", "./Assets/Importer/Image-debug", "./Assets/Importer/DDS-debug", "./UIBase/index-debug", "./UIBase/Button-debug", "./UIBase/Checkbox-debug", "./UIBase/Float-debug", "./UIBase/Image-debug", "./UIBase/Input-debug", "./UIBase/Label-debug", "./UIBase/Color-debug", "./UIBase/Layer-debug", "./UIBase/Link-debug", "./UIBase/Node-debug", "./UIBase/Panel-debug", "./UIBase/Select-debug", "./UIBase/Texture-debug", "./UIBase/Tree-debug", "./UIBase/Vector-debug", "./UIBase/Video-debug", "./UIBase/Tab-debug", "./UIBase/Mixin/index-debug", "./UIBase/Mixin/Collapsable-debug", "./UIBase/Mixin/Scrollable-debug", "./UIBase/Mixin/InputPin-debug", "./UIBase/Mixin/Pin-debug", "./UIBase/Mixin/OutputPin-debug", "./Helpers/index-debug", "./Helpers/Boundingbox-debug", "./Helpers/Camera-debug", "./Helpers/Light-debug", "./Helpers/Manipulator-debug", "./Helpers/Scene-debug", "./Helpers/Wireframe-debug"], function(require, exports, module){

	exports.Hub 	= require('./Hub-debug');
	exports.svg 	= require('./svg-debug');
	exports.MouseEventDispatcher = require('./MouseEventDispatcher-debug');
	exports.Assets 	= require('./Assets/index-debug');
	exports.UIBase 	= require('./UIBase/index-debug');
	exports.Helpers = require('./Helpers/index-debug');
})

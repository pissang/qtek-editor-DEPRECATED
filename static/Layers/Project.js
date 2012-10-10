//=================================
// Project.js
// 项目的资源模块，不同于资源模块，只有一个实例, 项目的所有资源文件都需要添加到这里或从这里获取
// 
// 不同与其它模块，该模块会提供多个资源获取的接口
// 
// Prefabs ?
//=================================
define(['./Asset', './Hub', './Scene'], function(require, exports, module){

	var UI = require('../UI/index');
	var hub = require('./Hub').getInstance();
	var Asset = require('./Asset');

	var view;

	var defaultTexture = THREE.ImageUtils.generateDataTexture( 1, 1, new THREE.Color( 0xffffff ) );
	defaultTexture.__system__ = true;

	function getInstance(){
		if( ! view){

			var layer = Asset.create('Project');
			view = layer.view;
			view.$el.attr('id', 'Project');

			handleHubEvent();
			// 
			handleDragEvent();

			addDefaultAsset();

		}

		//提供给外部的接口
		return {
			view : view,

			getAsset : getAsset,

			getGeometryInstance : getGeometryInstance,

			getMeshInstance : getMeshInstance,

			shallowCloneGeo : shallowCloneGeo,

			shallowCloneNode : shallowCloneNode,
			
			shallowCloneMaterial : shallowCloneMaterial,

			splitGeometry : splitGeometry,

			computeBoundingBox : computeBoundingBox,

			traverseHierarchy : traverseHierarchy,

			receiveDataTransfer : receiveDataTransfer,

			toJSON : toJSON,

			geometryToJSON : geometryToJSON,

			nodeToJSON : nodeToJSON,

			materialToJSON : materialToJSON,

			textureToJSON : textureToJSON
		}
	}

	function handleHubEvent(){

		hub.on('upload:file', function(file){
			readFile(file);
			hub.trigger('uploaded:file');
		});
		var updateDelay;
		// regenerate the material thumb
		hub.on('updated:object', function(object, queryStr, val){
			if( updateDelay ){
				clearTimeout( updateDelay );
			}
			updateDelay = setTimeout(function(){

				if( object instanceof THREE.Material ){

					var matView = view.findByName('Material');
					var uri = '/project/material/'+object.name;
					matView.$el.find('.asset-item').each(function(){
						if( $(this).data('uri') == uri ){
							$(this).find('.thumb').attr('src', previewMaterial( object ) );
						}
					})
				}
			}, 500);
			
		})
	}

	// 拖拽读取
	function handleDragEvent(){
		document.body.addEventListener('dragover', function(e){
			e.stopPropagation();
			e.preventDefault();
		});
		document.body.addEventListener('drop', function(e){
			e.stopPropagation();
			e.preventDefault();
			var files = e.dataTransfer.files;
			_.each(files, function(file){

				hub.trigger('upload:file', file);
			})
		})
	}

	// 默认的几个资源
	function addDefaultAsset(){
		var cube = new THREE.CubeGeometry( 10, 10, 10, 1, 1, 1);
		cube.name = 'Cube';
		var sphere = new THREE.SphereGeometry( 5 ,20, 20);
		sphere.name = 'Sphere';
		var plane = new THREE.PlaneGeometry( 10, 10 );
		plane.name = 'Plane';
		var cylinder = new THREE.CylinderGeometry( 5, 5, 5, 20 );
		cylinder.name = 'Cylinder';

		addGeometry(cube);
		addGeometry(sphere);
		addGeometry(plane);
		addGeometry(cylinder);

		var defaultMaterial = new THREE.MeshLambertMaterial( );
		defaultMaterial.name = '__default__';

		addMaterial(defaultMaterial);
	}

	// use FileReader api
	// http://www.html5rocks.com/en/tutorials/file/dndfiles/
	function readFile(file){
		var fileSplited = file.name.split('.'),
			ext = fileSplited.pop(),
			name = fileSplited.join('.');
		// zip asset file
		if(ext.toLowerCase() == 'zip'){

			readZip( file );
		}
		// binary file
		if(file.type == 'application/octet-stream'){

			readBinary( file, name );
		}
		// js file
		else if(file.type == 'application/x-javascript'){

			readJSON( file, name );
		}
		// collada file
		else if(file.name.split('.').pop().toLowerCase() == 'dae'){
			
			readCollada( file, name );
		}
		// image file
		else if( file.type.match('image/.*') ){

			readImage( file  );
		}
	}

	////////////////File Read Functions///////////////////////////
	function readBinary(file, name){
		var reader = new FileReader();
		var loader = new THREE.BinaryLoader();

		reader.onload = function(evt){

			if(evt.target.readyState == FileReader.DONE){

				loader.createBinModel(evt.target.result, function(geo){

					geo.name = name;

					geoList = splitGeometry( geo );

					_.each(geoList, function(subGeo, index){
						
						var node = new THREE.Object3D();

						addGeometry(subGeo);
					})
				}, '', []);
			}
		}
		reader.readAsArrayBuffer(file);
	}

	function readJSON(file, name){

		var reader = new FileReader();
		var loader = new THREE.JSONLoader();

		reader.onload = function(evt){

			if(evt.target.readyState == FileReader.DONE){

				var json = JSON.parse(evt.target.result);

				var materialList = [];
				// create materials;
				_.each(json.materials, function(mat){

					var material = createMaterial( mat );
					
					materialList.push( material );
				})

				if( ! json.buffers){

					loader.createModel(json, function(geo){
						
						geo.name = name;
						// has face material;
						if( isBitSet( json.faces[0], 1 ) ){

							var node = createSplittedMeshes(geo, materialList);
							
							// add mesh to asset
							addMesh(node);
						}
						else{
							
							addGeometry( geo );
							
							var mesh = getGeometryInstance( geo );

							addMesh( mesh );
						}
					});
				}
			} 
		}
		reader.readAsText(file);
	}

	function createSplittedMeshes(geo, materialList){

		geoList = splitGeometry( geo );

		var node = new THREE.Object3D();
		node.name = geo.name;

		_.each(geoList, function(subGeo, index){
			
			// add geometry to asset;
			addGeometry(subGeo);

			var mesh = getGeometryInstance(subGeo, materialList[index]);
			node.add(mesh);

		})

		return node;
	}

	function readCollada(file, name){

		var reader = new FileReader();
		var loader = new THREE.ColladaLoader();
		loader.options.convertUpAxis = true;

		reader.onload = function(evt){

			if(evt.target.readyState == FileReader.DONE){

				var domParser = new DOMParser();
				var doc = domParser.parseFromString(evt.target.result, 'application/xml');
				
				loader.parse(doc, function(result){

					result.scene.name = name;
					
					hub.trigger('add:node', result.scene);
				})
			}
		}
		reader.readAsText(file);
	}

	function readImage(file){

		var reader = new FileReader();
		reader.onload = function(evt){

			if(evt.target.readyState == FileReader.DONE){
				
				var image = new Image();
				image.src = evt.target.result;
				var texture = new THREE.Texture(image);

				texture.name = file.name;
				addTexture( texture );
			}
		}
		reader.readAsDataURL(file);
	}

	///////big one!!!!!!
	//todo 这么多回调是否要使用streamline.js？
	function readZip(file){

		// 用作索引
		var materials = [];

		// based on zip.js
		zip.createReader(new zip.BlobReader(file), function(reader){
			
			reader.getEntries( function(entries){

				var count = 0;
				var countImage = 0;
				// add textures
				_.each( entries, function(entry){

					var fileName = entry.filename,
						mimetype = zip.getMimeType(fileName);

					//image file
					if( mimetype.match('image/.*') ){

						count++;

						entry.getData(new zip.Data64URIWriter( mimetype ), function(data){
						
							var img = new Image();
							img.onload = function(){				
								// callback when all images are loaded
								count--;
								countImage--;
								if( count == 0 && countImage == 0){

									readMaterialFile();
								}
							}
							img.src = data;
							countImage++;

							var texture = new THREE.Texture(img);
							texture.name = fileName;
							//
							addTexture( texture );

						})	//end get data


					}

				} )	//end each

				function readMaterialFile(){

					//add materials
					_.each( entries, function(entry){

						var fileName = entry.filename,
							fileSplitted = fileName.split('.'),
							ext = fileSplitted.pop(),
							name = fileSplitted.join('.');

						//material file
						if( ext == 'js'){

							entry.getData( new zip.TextWriter(), function(json){

								var json = JSON.parse(json);

								_.each( json.materials, function(mat){

									var material = createMaterial( mat );

									materials.push(material);

								} )	// end each

								if( ! json.buffers){

									var loader = new THREE.JSONLoader();

									loader.createModel(json, function(geo){
										
										geo.name = name;
										// has face material;
										if( isBitSet( json.faces[0], 1 ) ){

											var node = createSplittedMeshes(geo, materials);
											
											// add mesh to asset
											addMesh(node);
										}
										else{
											
											addGeometry( geo );
											
											var mesh = getGeometryInstance( geo );

											addMesh( mesh );
										}
									});	// end create model

								}
								else {

									var binaryFileName = json.buffers;

									var binaryFile = _.find(entries, function(entry){ 
											return entry.filename === binaryFileName 
										});

									//todo 目前无法使用
									binaryFile.getData(new zip.BlobWriter(), function(binary){

										var loader = new THREE.BinaryLoader();

										loader.createBinModel( binary, function(geo){

											createSplittedMeshes( geo, materials );

										}, '', [] )// end createBinModel

									})//end getData
								}

							} ) // end getData
						}

					} );	//end each
				}	//end read material file

			} )	//end getEntries

			reader.close();
		})

	}

	// 根据material的json文件导出material
	// todo needs to support compressed texture
	// 		same texture multiple repeats
	// 将THREE.js的Lambert，Phong等材质都同一搞成ShaderMaterial
	// 
	// modified from THREE.Loader.createMaterial
	function createMaterial(m){
		
		var material = getMaterial( m.DbgName );
		
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

			mpars['map'] = getTexture(m.mapDiffuse);
		}

		if ( m.mapLight ) {

			mpars['lightMap'] = getTexture(m.mapLight);
			
		}

		if ( m.mapBump ) {

			mpars['bumpMap'] = getTexture( m.mapBump );
			
		}

		if ( m.mapNormal ) {

			mpars['normalMap'] = getTexture(m.mapNormal);
	
		}

		if ( m.mapSpecular ) {

			mpars['specularMap'] = getTexture(m.mapSpecular);

		}

		//

		if ( m.mapBumpScale ) {

			mpars.bumpScale = m.mapBumpScale;

		}

		// special case for normal mapped material

		if ( m.mapNormal ) {

			var shader = THREE.ShaderUtils.lib[ "normal" ];
			var uniforms = THREE.UniformsUtils.clone( shader.uniforms );

			uniforms[ "tNormal" ].value = mpars.normalMap;

			if ( m.mapNormalFactor ) {

				uniforms[ "uNormalScale" ].value.set( m.mapNormalFactor, m.mapNormalFactor );

			}

			if ( mpars.map ) {

				uniforms[ "tDiffuse" ].value = mpars.map;
				uniforms[ "enableDiffuse" ].value = true;

			}

			if ( mpars.specularMap ) {

				uniforms[ "tSpecular" ].value = mpars.specularMap;
				uniforms[ "enableSpecular" ].value = true;

			}

			if ( mpars.lightMap ) {

				uniforms[ "tAO" ].value = mpars.lightMap;
				uniforms[ "enableAO" ].value = true;

			}

			// for the moment don't handle displacement texture

			uniforms[ "uDiffuseColor" ].value.setHex( mpars.color );
			uniforms[ "uSpecularColor" ].value.setHex( mpars.specular );
			uniforms[ "uAmbientColor" ].value.setHex( mpars.ambient );

			uniforms[ "uShininess" ].value = mpars.shininess;

			if ( mpars.opacity !== undefined ) {

				uniforms[ "uOpacity" ].value = mpars.opacity;

			}

			var parameters = { fragmentShader: shader.fragmentShader, vertexShader: shader.vertexShader, uniforms: uniforms, lights: true, fog: true };
			var material = new THREE.ShaderMaterial( parameters );

		} else {

			var material = new THREE[ mtype ]( mpars );

		}

		if ( m.DbgName !== undefined ) {
			material.name = m.DbgName;
		}
		else{
			material.name == 'Material_' + (material_slot++);
		}

		addMaterial( material );
		return material;
	}

	var material_slot = 0;

	////////////////asset management/////////////////////////////

	var depository = {
		texture : new Backbone.Collection,
		geometry : new Backbone.Collection,
		mesh : new Backbone.Collection,
		material : new Backbone.Collection
	}

	function getAsset(uri){

		if( uri.match(/\/project\/([\S\s]*)/) ){

			var result = /\/project\/([\S\s]*)\/([\S\s]*)/.exec(uri);
			var type = result[1],
				name = result[2];
			if( ! depository[type] ){
				return;
			}
			var item = depository[type].where({
				name : name
			})[0];
			if(item){
				return item;
			}
		}
	}
	// 生成一个geometry的mesh instance
	function getGeometryInstance(geo, material){
		if( _.isString(geo) ){
			geo = getGeometry( geo );
		}
		if( ! material){
			
			material = new THREE.MeshLambertMaterial( {
				wireframe : true,
				color : 0xffffff*Math.random(),
				map : defaultTexture
			} );
			material.map.__default__ = true;
			// 用来判断是否是系统自带材质
			material.__system__ = true;
		}
		// https://github.com/mrdoob/three.js/issues/363
		// https://github.com/mrdoob/three.js/wiki/Updates

		var mesh = new THREE.Mesh(geo, material);
		mesh.name = geo.name+'_'+geo.__referencecount__;
		geo.__referencecount__++;

		return mesh;
	}

	function getMeshInstance( root ){
		if( _.isString(root)){
			root = getMesh( root );
		}

		var rootCopied = new THREE.SceneUtils.cloneObject(root);

		traverseHierarchy(rootCopied, function(nodeCopied){
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

	function getMesh(name){

		var item = depository.mesh.where({
			name : name
		})[0];

		if( item ){

			return item.get('data');
		}
		else{
			return null;
		}
		
	}

	function getGeometry(name){

		var item = depository.geometry.where({
			name : name
		})[0];

		if( item ){

			return item.get('data');
		}
		else{
			return null;
		}
		
	}

	function getTexture(name){

		var item = depository.texture.where({
			name : name
		})[0];

		if( item ){
			var texture = item.get('data');
			texture.needsUpdate = true;
			return texture;
		}
		else{
			return null;
		}
		
	}

	function getMaterial(name){

		var item = depository.material.where({
			name : name
		})[0];

		if( item ){

			return item.get('data');
		}
		else{
			return null;
		}
		
	}

	function addMesh(mesh){

		hub.trigger('add:asset:mesh', [{
			name : mesh.name,
			thumb : previewMesh( mesh ),
			uri : '/project/mesh/'+mesh.name
		}]);
		depository['mesh'].add({
			name : mesh.name,
			data : mesh
		});
		// geo被mesh引用的次数
		mesh.__referencecount__ = 0;
	}

	function addGeometry(geo){

		if( ! geo.boundingBox ){

			geo.computeBoundingBox();
		}

		hub.trigger('add:asset:geometry', [{
			name : geo.name,
			thumb : previewGeo(geo),
			uri : '/project/geometry/'+geo.name
		}]);
		depository['geometry'].add({
			name : geo.name,
			data : geo
		});
		// geo被mesh引用的次数
		geo.__referencecount__ = 0;
	}

	function addTexture(texture){

		hub.trigger('add:asset:texture', [{
			'name' : texture.name,
			'uri' : '/project/texture/'+texture.name,
			'thumb' : texture.image.src
		}]);

		depository['texture'].add({
			'name' : texture.name,
			'data' : texture
		});
	}

	function addMaterial(material){
		// https://github.com/mrdoob/three.js/issues/2073
		// https://github.com/mrdoob/three.js/issues/363
		// orz.....
		if( ! material.map ){

			material.map = defaultTexture;
		}

		hub.trigger('add:asset:material', [{
			'name' : material.name,
			'uri' : '/project/material/'+material.name,
			'thumb' :previewMaterial(material)
		}]);

		depository['material'].add({
			'name' : material.name,
			'data' : material
		});
	}

	//
	// 把资源拖拽到其它面板上后的处理
	// json = e.dataTransfer.getData('text/plain')
	// 
	function receiveDataTransfer(json, accept){

		json = JSON.parse(json);

		var name, data;
		// 是本地的project里的资源
		if(json.uri.match(/\/project\/([\S\s]*)/)){

			var item = getAsset(json.uri);
			if( ! item){
				return;
			}
			name = item.get('name');
			data = item.get('data');
		}
		if( _.isString( accept ) ){
			accept = [accept];
		}
		if( ! _.find(accept, function(item){return item==json.type} ) ){
			return;
		}
		if( json.type == 'geometry'){

			return getGeometryInstance(data)
		}
		else if( json.type == 'mesh' ){

			return getMeshInstance(data)
		}
		else if( json.type == 'material' ){

			return data;
		}
		else if( json.type =='texture'){
			
			return data;
		}
	}


	var previewMat = new THREE.MeshBasicMaterial( {wireframe:true} );
	var previewLight = new THREE.DirectionalLight( 0xffffff );
	previewLight.position = new THREE.Vector3(2,2,2);
	var previewCamera = new THREE.PerspectiveCamera( 60, 1, 1, 10 );
	previewCamera.position.set(0.4, 0.4, 1.6);
	previewCamera.lookAt(new THREE.Vector3( 0, 0, 0 ));
	var previewRenderer = new THREE.WebGLRenderer( );
	previewRenderer.setSize(100, 100);
	var previewScene = new THREE.Scene();
	previewScene.add(previewLight);
	var previewSphereGeo = new THREE.SphereGeometry( 0.7, 20, 20 );

	function previewGeo(geo){

		var geo = shallowCloneGeo( geo );
		var mesh = new THREE.Mesh(geo, previewMat);
		
		// scale to 1, 1, 1 size
		var size = new THREE.Vector3( );
		var bb = geo.boundingBox;
		size.sub( bb.max, bb.min);
		mesh.scale.set(1/size.x, 1/size.y, 1/size.z);

		previewScene.add(mesh);
		previewRenderer.render(previewScene, previewCamera);

		previewScene.remove(mesh);

		return previewRenderer.domElement.toDataURL();
	}

	function previewMaterial(material){

		var mesh = new THREE.Mesh(previewSphereGeo, shallowCloneMaterial(material) );
		previewScene.add(mesh);
		previewRenderer.render(previewScene, previewCamera);
		previewScene.remove(mesh);

		return previewRenderer.domElement.toDataURL();
	}

	function previewMesh( mesh ){

		mesh = shallowCloneNode(mesh);

		var size = new THREE.Vector3();
		var bb = computeBoundingBox( mesh );
		size.sub( bb.max, bb.min);
		mesh.scale.set(1/size.x, 1/size.y, 1/size.z);

		previewScene.add(mesh );
		previewRenderer.render(previewScene, previewCamera);
		previewScene.remove(mesh);

		return previewRenderer.domElement.toDataURL();
	}

	function previewTexture(image){

		var canvas = document.createElement('canvas');
		canvas.width = 100;
		canvas.height = 100;
		canvas.getContext('2d').drawImage(image, 0, 0, 100, 100);
		return canvas.toDataURL();
	}

	// 浅复制一个geometry，用于不同的renderer上, 保证资源的干净
	function shallowCloneGeo(geo){
		var cloneGeo = new THREE.Geometry();

		_.extend(cloneGeo, {
			vertices : geo.vertices,
			faces : geo.faces,
			faceVertexUvs : geo.faceVertexUvs,
			boundingBox : geo.boundingBox
		})

		return cloneGeo;
	}

	// 浅复制一个 mesh， 用于不同的renderer上, 保证资源的干净
	function shallowCloneNode(root){
		
		var nodes = {};

		var rootCopied = new THREE.SceneUtils.cloneObject(root);

		traverseHierarchy( rootCopied, function(nodeCopied){
			
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

	// 浅复制一个 material， 用于不同的renderer上
	// 主要需要复制所有的texture
	function shallowCloneMaterial(mat){

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

	//
	//分割有多个material的geometry，使得每个mesh都只有一个单独的material
	//为了清晰，不适用three.js的face material
	//todo morphTarget, morphColor, morphNormals, skinWeights?
	//
	function splitGeometry(geo){

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
	function computeBoundingBox(_node){

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

	// modify from THREE.SceneUtilstraverseHierarchy
	function traverseHierarchy(root, callback){
		var n, i, l = root.children.length;
		
		callback(root);
		
		for ( i = 0; i < l; i ++ ) {

			n = root.children[ i ];

			traverseHierarchy( n, callback );

		}
	}

	function isBitSet(value, position){
		return value & ( 1 << position );
	}

	// todo need a export module
	//
	function toJSON( filters){

		var json = {
			mesh : [],
			geometry : [],
			texture : [],
			material : []
		};
		filters = filters || ['geometry', 'material', 'mesh', 'texture'];

		if( _.indexOf( filters, 'geometry') >= 0){

			depository.geometry.forEach( function( item ){

				json.geometry.push({
					name : item.get('name'),
					data : geometryToJSON( item.get('data') )
				});
			} );
		}
		if( _.indexOf( filters, 'material') >= 0){

			depository.material.forEach( function( item ){

				json.material.push({
					name : item.get('name'),
					data : materialToJSON( item.get('data') )
				});
			} );
		}
		if( _.indexOf( filters, 'mesh') >= 0){

			depository.mesh.forEach( function( item ){

				json.mesh.push({
					name : item.get('name'),
					data : nodeToJSON( item.get('data') )
				});
			} );
		}
		if( _.indexOf( filters, 'texture') >= 0){

			depository.texture.forEach( function(item) {

				json.texture.push({
					name : item.get('name'),
					data : textureToJSON( item.get('data') )
				});
			} );
		}

		return json;
	}

	//save geometory to json
	//
	//https://github.com/mrdoob/three.js/wiki/JSON-Model-format-3.1
	function geometryToJSON(geo){
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

	        bitset = 	isQuad 
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

	var textureUriBase = '/project/texture/',
		materialUriBase = '/project/material/',
		geometryUriBase = '/project/geometry/';

	function nodeToJSON( _node ){

		var items = {};
		// flattening the scene
		traverseHierarchy( _node, function( node ){

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

							item[propName] = materialUriBase + prop.name;
						}
						else if( prop instanceof THREE.Geometry){

							item[propName] = geometryUriBase + prop.name;
						}
					})
				}
			} )

		} );

		return items;
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

	// todo 导出配置的最大最小值
	function materialToJSON( material, exportConfig ){

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

	function textureToJSON(texture){

		var json = {};
		json.name = texture.name;

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

	// modify from THREE.TriangulateQuads
	// todo need move to somewhere else
	function triangulateQuads( geometry ) {

		var i, il, j, jl;

		var faces = [];
		var faceUvs = [];
		var faceVertexUvs = [];

		for ( i = 0, il = geometry.faceUvs.length; i < il; i ++ ) {

			faceUvs[ i ] = [];

		}

		for ( i = 0, il = geometry.faceVertexUvs.length; i < il; i ++ ) {

			faceVertexUvs[ i ] = [];

		}

		for ( i = 0, il = geometry.faces.length; i < il; i ++ ) {

			var face = geometry.faces[ i ];

			if ( face instanceof THREE.Face4 ) {

				var a = face.a;
				var b = face.b;
				var c = face.c;
				var d = face.d;

				var triA = new THREE.Face3();
				var triB = new THREE.Face3();

				triA.color.copy( face.color );
				triB.color.copy( face.color );

				triA.materialIndex = face.materialIndex;
				triB.materialIndex = face.materialIndex;

				triA.a = a;
				triA.b = b;
				triA.c = d;

				triB.a = b;
				triB.b = c;
				triB.c = d;

				if ( face.vertexColors.length === 4 ) {

					triA.vertexColors[ 0 ] = face.vertexColors[ 0 ].clone();
					triA.vertexColors[ 1 ] = face.vertexColors[ 1 ].clone();
					triA.vertexColors[ 2 ] = face.vertexColors[ 3 ].clone();

					triB.vertexColors[ 0 ] = face.vertexColors[ 1 ].clone();
					triB.vertexColors[ 1 ] = face.vertexColors[ 2 ].clone();
					triB.vertexColors[ 2 ] = face.vertexColors[ 3 ].clone();

				}

				faces.push( triA, triB );

				for ( j = 0, jl = geometry.faceVertexUvs.length; j < jl; j ++ ) {

					if ( geometry.faceVertexUvs[ j ].length ) {

						var uvs = geometry.faceVertexUvs[ j ][ i ];

						var uvA = uvs[ 0 ];
						var uvB = uvs[ 1 ];
						var uvC = uvs[ 2 ];
						var uvD = uvs[ 3 ];

						var uvsTriA = [ uvA.clone(), uvB.clone(), uvD.clone() ];
						var uvsTriB = [ uvB.clone(), uvC.clone(), uvD.clone() ];

						faceVertexUvs[ j ].push( uvsTriA, uvsTriB );

					}

				}

				for ( j = 0, jl = geometry.faceUvs.length; j < jl; j ++ ) {

					if ( geometry.faceUvs[ j ].length ) {

						var faceUv = geometry.faceUvs[ j ][ i ];

						faceUvs[ j ].push( faceUv, faceUv );

					}

				}

			} else {

				faces.push( face );

				for ( j = 0, jl = geometry.faceUvs.length; j < jl; j ++ ) {

					if ( geometry.faceUvs[ j ].length ) {	// add a condition

						faceUvs[ j ].push( geometry.faceUvs[ j ][ i ] );
					}
				}

				for ( j = 0, jl = geometry.faceVertexUvs.length; j < jl; j ++ ) {

					faceVertexUvs[ j ].push( geometry.faceVertexUvs[ j ][ i ] );

				}

			}

		}

		geometry.faces = faces;
		geometry.faceUvs = faceUvs;
		geometry.faceVertexUvs = faceVertexUvs;

		geometry.computeCentroids();
		geometry.computeFaceNormals();
		geometry.computeVertexNormals();

		if ( geometry.hasTangents ) geometry.computeTangents();

	};


	return {
		getInstance : getInstance
	}
})
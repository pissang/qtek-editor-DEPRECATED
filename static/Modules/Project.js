//=================================
// Project.js
//=================================
define(function(require, exports, module){

	var UIBase = require('../UIBase/index');
	UIBase.Mixin = require('../UIBase/Mixin/index');
	var hub = require('./Hub').getInstance();
	var Assets = require('./Assets/index');
	var FS = Assets.FileSystem;

	var view,
		treeView;

	var fsProjectFolder;

	function getInstance(){
		if( ! view){

			view = new UIBase.Panel.View;
			view.setName('Project');
			view.$el.attr('id', 'Project');

			UIBase.Mixin.Scrollable.applyTo( view );

			// create treeview and project folder
			treeView = new UIBase.Tree.View;
			treeView.root.owner = 'project';
			treeView.model.set('json', [{
				type : 'folder',
				name : 'project',
				icon : 'icon-project-folder icon-small'
			}])
			// create project folder in FS
			fsProjectFolder = FS.root.createFolder('project');

			view.appendView( treeView );

			handleHubEvent();
			 
			handleDragEvent();

			initTreeView();
		}

		//提供给外部的接口
		return {
			view : view,

			receiveDataTransfer : receiveDataTransfer,

		}
	}

	function handleHubEvent(){

		hub.on('upload:file', function(file){
			
			fileHandleDispatch( file );

			hub.trigger('uploaded:file');
		});

	}

	// 拖拽读取
	function handleDragEvent(){

		view.$el[0].addEventListener('dragover', function(e){
			e.stopPropagation();
			e.preventDefault();
		});
		view.$el[0].addEventListener('drop', function(e){
			e.stopPropagation();
			e.preventDefault();
			var files = e.dataTransfer.files;
			_.each(files, function(file){

				hub.trigger('upload:file', file);
			})
		})
	}
	//
	// build a bridge between treeview and filesystem
	//
	function initTreeView(){

		FS.root.on('added:node', function(parent, node){

			if( node.type == 'folder'){
				var treeNode = new UIBase.Tree.Folder(node.name);
				treeNode.icon = 'icon-project-folder icon-small';
			}else{
				var treeNode = new UIBase.Tree.File(node.name);
				treeNode.icon = 'icon-project-file icon-small';
			}
			treeView.find( parent.getPath() ).add( treeNode, true);
		})
		FS.root.on('moved:node', function(parent, parentPrev, node){
			
			var treeNode = treeView.find(parentPrev.getPath() + '/' + node.name);
			
			treeView.find( parent.getPath() ).add( treeNode, true);
		})
		FS.root.on('removed:node', function(parent, node){
			
			treeView.remove(node.getPath());
		})
		treeView.on('added:node', function(parent, node){


		})
		treeView.on('moved:node', function(parent, parentPrev, node){

			var fsNode = FS.root.find(parentPrev.getPath() + '/' + node.name);
	
			FS.root.find(parent.getPath()).add(fsNode, true);
		})
		treeView.on('removed:node', function(parent, node){

		})
	}

	// use FileReader api
	// http://www.html5rocks.com/en/tutorials/file/dndfiles/
	function fileHandleDispatch(file){

		var ext = Assets.Util.parseFileName(file.name).ext.toLowerCase();
		// zip asset file
		switch(ext){
			case 'zip':
				break;
			case 'bin':
				require('./Assets/Importer/Binary').importFromFile( file, FS.root.find('project') );
				break;
			case 'js':
				require('./Assets/Importer/JSON').importFromFile( file, FS.root.find('project') );
				break;
			case 'png':
			case 'jpg':
			case 'jpeg':
			case 'bmp':
				break;
		}
	}

	////////////////File Read Functions///////////////////////////

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

	////////////////asset management/////////////////////////////

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

	return {
		getInstance : getInstance
	}
})
//=================================
// Project.js
// manage all the assets need for the project
// assets management is based on the FileSystem
//=================================
define(function(require, exports, module){

	var UIBase = require('../Core/UIBase/index');
	UIBase.Mixin = require('../Core/UIBase/Mixin/index');
	var hub = require('../Core/Hub').getInstance();
	var Assets = require('../Core/Assets/index');
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
		}
	}

	function handleHubEvent(){

		hub.on('upload:file', function(file){
			
			fileHandleDispatch( file, FS.root.find('project') );

			hub.trigger('uploaded:file');
		});

		hub.on('create:asset', function(type){
			switch(type){
				case 'texture':
					createTextureAsset();
					break;
				case 'texturecube':
					createTextureCubeAsset();
					break;
				case 'material':
					createMaterialAsset();
					break
			}
		});

		hub.on('create:folder', createFolder)
	}

	// empty assets create functions
	var createFolder = (function(){
		var id = 0;
		return function(){
			
			getParentFolder().createFolder('empty_'+(id++));
		}
	})();

	var createTextureAsset = (function(){
		var id = 0;
		return function(){
			var name = 'texture_'+(id++),
				texture = new THREE.Texture( new Image );
			texture.name = name;
			var	asset = Assets.Texture.create(texture);
			getParentFolder().createFile(name, asset);
		}
	})()

	var createTextureCubeAsset = (function(){
		var id = 0;
		return function(){
			var name = 'texturecube_'+(id++),
				texture = new THREE.Texture( [
					new Image,
					new Image,
					new Image,
					new Image,
					new Image,
					new Image
				]);
			texture.name = name;
			var asset = Assets.TextureCube.create(texture);
			getParentFolder().createFile(name, asset);
		}
	})()

	var createMaterialAsset = (function(){
		var id = 0;
		return function(){
			var name = 'material_'+(id++),
				material = new THREE.MeshLambertMaterial();
			material.name = name;
			var asset = Assets.Material.create(material);
			getParentFolder().createFile(name, asset);
		}
	})()

	var getParentFolder = function(){
		var selected = treeView.getSelected(),
			parent;
		if( selected.length ){
			var treeNode = _.last(selected);
			var fsNode = FS.root.find(treeNode.getPath());
			if( ! fsNode){
				console.warn('folder '+treeNode.getPath()+' not exist in project');
				parent = fsProjectFolder;
			}else{
				parent = fsNode;
			}
		}else{
			parent = fsProjectFolder;
		}
		return parent;
	}



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

				if( node.data && node.data.getThumb ){
					// use asset thumb
					var base64Src = node.data.getThumb(20);
					var image = new Image();
					image.src = base64Src;
					image.className = 'asset-thumb-'+node.data.type;//for default asset thumb
					treeNode.icon = image;
				}else{
					treeNode.icon = 'icon-project-'+node.data.type+' icon-small';
				}
			}
			if(node.data){
				treeNode.dataSource = node.getPath();									
				treeNode.dataType = node.data.type;
			}
			treeView.find( parent.getPath() ).add( treeNode, true);
		})
		FS.root.on('moved:node', function(parent, parentPrev, node){
			
			var nodePrevPath = parentPrev.getPath() + '/' + node.name;
			var treeNode = treeView.find( nodePrevPath );
			if( ! treeNode){
				console.warn( 'node '+nodePrevPath+' not exist in the project tree');
				return;
			}
			
			treeView.find( parent.getPath() ).add( treeNode, true);
		})
		FS.root.on('removed:node', function(parent, node){
			
			treeView.remove(node.getPath());
		})
		FS.root.on('updated:name', function(node, name){

			var treeNode = treeView.find(node.getPath());
			if( ! treeNode){
				console.warn( 'node '+node.getPath()+' not exist in the project tree');
				return;
			}
			treeNode.setName(name, true);
		})
		treeView.on('added:node', function(parent, node){


		})
		treeView.on('moved:node', function(parent, parentPrev, node){

			var nodePrevPath = parentPrev.getPath() + '/' + node.name;
			var fsNode = FS.root.find(nodePrevPath);
			if( ! fsNode){
				console.warn( 'file '+nodePrevPath+' not exist in the project');
				return;
			}
	
			FS.root.find(parent.getPath()).add(fsNode, true);
		})
		treeView.on('removed:node', function(parent, node){

		})
		treeView.on('click:node', function(node){
			var fsNode = FS.root.find( node.getPath() );
			if( ! fsNode){
				console.warn( 'file '+nodePrevPath+' not exist in the project');
				return;
			}
			// inspect asset properties
			if(fsNode.data){
				hub.trigger('inspect:object', fsNode.data.getConfig() );
			}
			else if(node.type == 'folder'){
				hub.trigger('inspect:object', {
					'Folder' : {
						type : 'layer',
						'class' : 'folder',
						sub : {
							name : {
								type : 'input',
								value : fsNode.name,
								onchange : function(value){
									// set node name;
									fsNode.setName(value);
								}
							}
						}
					}
				})
			}
		})
	}

	// use FileReader api
	// http://www.html5rocks.com/en/tutorials/file/dndfiles/
	function fileHandleDispatch(file, parent){

		var ext = Assets.Util.parseFileName(file.name).ext.toLowerCase();
		// zip asset file
		switch(ext){
			case 'zip':
				break;
			case 'bin':
				require('../Core/Assets/Importer/Binary').importFromFile( file, parent );
				break;
			case 'js':
				require('../Core/Assets/Importer/JSON').importFromFile( file, parent );
				break;
			case 'dae':
				require('../Core/Assets/Importer/Collada').importFromFile( file, parent );
				break;
			case 'png':
			case 'jpg':
			case 'jpeg':
			case 'gif':
			case 'bmp':
				require('../Core/Assets/Importer/Image').importFromFile( file, parent );
				break;
			case 'dds': // compressed texture
				require('../Core/Assets/Importer/DDS').importFromFile( file, parent );
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
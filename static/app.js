//====================================
//app.js
//===================================
define(function(require){
	
	var UI = require('./UI/index');
	var svg = require('./svg');
	var config = require('./config');

	var $App = $('#App');
	$App.width($(window).width());
	$App.height($(window).height());

	// 菜单层
	var $Header = $('#Header')
	var menuLayer = require('./Layers/Menu').getInstance();
	$Header.append(menuLayer.view.$el);

	$Workspace = $('#Workspace').height($App.height()-20 - $Header.height());

	$Main = $('#Main');
	$Sidebar = $('#Sidebar');

	// Editor的Tab
	var tabView = new UI.Tab.View();
	$Main.find('.row-1').append(tabView.$el);
	// 初始化各个Layer(Editor)
	var sceneEditorLayer = require('./Layers/Scene').getInstance();
	tabView.appendView(sceneEditorLayer.view);

	var compositorLayer = require('./Layers/Compositor').getInstance();
	tabView.appendView(compositorLayer.view);

	tabView.active('Scene');

	//Animation和console
	var tabView = new UI.Tab.View();
	$Main.find('.row-2').append(tabView.$el);
	var animationLayer = require('./Layers/Animation').getInstance();
	tabView.appendView(animationLayer.view);

	var consoleLayer = require('./Layers/Console').getInstance();
	tabView.appendView(consoleLayer.view);

	var projectLayer = require('./Layers/Project').getInstance();
	tabView.appendView(projectLayer.view);

	tabView.active('Animation');

	// Sidebar的Tab
	var tabView = new UI.Tab.View();
	$Sidebar.find('.row-1').append(tabView.$el);
	var inspectorLayer = require('./Layers/Inspector').getInstance();
	tabView.appendView(inspectorLayer.view);

	var tabView = new UI.Tab.View();
	$Sidebar.find('.row-2').append(tabView.$el);
	var hierarchyLayer = require('./Layers/Hierarchy').getInstance();
	tabView.appendView(hierarchyLayer.view);

	
	// for test
	var hub = require('./Layers/Hub').getInstance();
	// hub.trigger('create:mesh', 'cube');

	$(document.body).keypress(function(e){
		var charCode = e.charCode,
			op = config.keymap[charCode];

		if(op){
			var params = op.split(',');
			hub.trigger.apply(hub, params);
		}
	})

	
	$Main.resizable({
		handles : 'e',
		resize : resize
	})
	$Main.find('.row-2').resizable({
		handles : 'n',
		resize : resize
	})
	$Sidebar.find('.row-2').resizable({
		handles : 'n',
		resize : resize
	})

	// 调整大小或者初始化后的布局
	resize();

	function resize(){

		$Workspace.layout({
			type : 'flexGrid',
			resize : false,
			rows : 1,
			columns : 2,
			hgap : 7,
			vgap : 0,
		})
		$Main.layout({
			type : 'flexGrid',
			resize : false,
			rows : 2,
			columns : 1,
			hgap : 0,
			vgap : 3,
		})
		$Sidebar.layout({
			type : 'flexGrid',
			resize : false,
			rows : 2,
			columns : 1,
			hgap : 0,
			vgap : 3,
		})
		// layout will set container($Main and $Sidebar) to relative
		$Main.css('position', 'absolute');
		$Sidebar.css('position', 'absolute');

		sceneEditorLayer.resize();
	}

	hub.trigger('initialized:app');

	hub.on('export:project', function(){

		var projectAssets = require('./Layers/Project').getInstance().toJSON();

		// write to local file system
		// createTempFile('project.b3d', function(zipFileEntry){

		// 	toZip( projectAssets, new zip.FileWriter(zipFileEntry), function( zipWriter ){

		// 		zipWriter.close(function(){

		// 			var url = zipFileEntry.toURL();
		// 		})
		// 	} );
		// })

		toZip( projectAssets, new zip.BlobWriter(), function( zipWriter){

			zipWriter.close(function(blob){

				//https://developer.mozilla.org/en-US/docs/DOM/window.URL.createObjectURL
				var URL = window.webkitURL || window.mozURL || window.URL;

				var url = URL.createObjectURL( blob );

				window.open(url);
				// 5s 后释放
				setTimeout( URL.revokeObjectURL( url ), 1000*5);
			})
		})
	})

	// todo need a module
	//	改为save的时候写入filesystem，export的时候直接下载
	hub.on('export:scene', function(){

		var project = require('./Layers/Project').getInstance();
		var projectAssets = project.toJSON(['geometry', 'material', 'texture']);
		
		var sceneLayer = require('./Layers/Scene').getInstance();
		projectAssets.scene = project.nodeToJSON( sceneLayer.scene );
		projectAssets['activeCamera'] = sceneLayer.getActiveCamera().name;
		// write to local file system
		toZip( projectAssets, new zip.BlobWriter(), function( zipWriter){

			zipWriter.close(function(blob){
				var URL = window.webkitURL || window.mozURL || window.URL;

				var url = URL.createObjectURL( blob );

				window.open(url, 'scene.b3d');
				// 1s 后释放
				setTimeout( URL.revokeObjectURL( url ), 1000*60);
			})
		})
	})

	function toZip(projectAssets, writer, callback){

		zip.createWriter(writer, function(zipWriter){
			var count = 0;
			
			writeImage( 0 );

			function writeImage( index ){

				var item = projectAssets.texture[index];
				if( ! item ){

					writeGeometry(0);
					return;
				}
				var texture = item.data;

				zipWriter.add( texture.name, new zip.Data64URIReader( texture.image ), function(){
					// set image to query string
					texture.image = texture.name;

					writeImage( index+1);
				} )
			}

			function writeGeometry(index){
				var item = projectAssets.geometry[index];
				if( ! item ){

					writeScene();
					return;
				}
				var geometry = item.data;

				zipWriter.add( item.name+'.geo', new zip.TextReader( JSON.stringify( geometry ) ), function(){
					//set data to query string
					item.data = item.name+'.geo';

					writeGeometry( index+1);
				} )
			}

			function writeScene(){

				_.each(projectAssets.texture, function( item ){

					var texture = item.data;
					texture.image = texture.name;
				})

				zipWriter.add( 'scene.js', new zip.TextReader( JSON.stringify( projectAssets ) ), function(){

					callback && callback( zipWriter );
				} )
			}
			

		})
	}

	//http://www.html5rocks.com/en/tutorials/file/filesystem/
	function createTempFile(name, callback) {
		
		var requestFileSystem = window.webkitRequestFileSystem || window.mozRequestFileSystem || window.requestFileSystem;

		var tmpFilename = name;
		// require for 200MB
		requestFileSystem(TEMPORARY, 200 * 1024 * 1024, function(filesystem) {
			function create() {
				filesystem.root.getFile(tmpFilename, {
					create : true
				}, function(zipFileEntry) {
					callback(zipFileEntry);
				});
			}

			filesystem.root.getFile(tmpFilename, null, function(entry) {
				entry.remove(create, create);
			}, create);
		});
	}

	//todo why twice?
	resize();

	$(window).resize( function(){
		resize();
	} )


	/////template scene
	hub.trigger('create:mesh', 'cube');
	hub.trigger('create:camera', 'perspective');
	hub.trigger('create:light', 'point');	
	hub.trigger('update:node', 'Cube_0', 'material', projectLayer.getAsset('/project/material/__default__').get('data') );
	hub.trigger('update:node', 'PointLight_0', 'position', {y:10, z:10, extend:true});	
})

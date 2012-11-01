//====================================
//app.js
//===================================
define(function(require){
	
	var UIBase = require('./Core/UIBase/index');
	var svg = require('./Core/svg');
	var hub = require('./Core/Hub').getInstance();
	var Layouts = require('./Modules/Layouts');

	var $Main = Layouts[0].init($('#App'));

	var $regions = $Main.find('.region');

	$regions.focus(function(){
		$(this).addClass('focus');
	}).blur(function(){
		$(this).removeClass('focus');
	})

	// init layout and modules
	$regions.each(function(){

		var modules = $(this).data('modules').split(' ');

		if( modules[0] != 'Menu'){

			var tabView = new UIBase.Tab.View;
			$(this).append(tabView.$el);
			var count = 0;
			_.each(modules, function(moduleName){
				count++
				require.async('./Modules/'+moduleName, function(module){
					var moduleInstance = module.getInstance();
					tabView.appendView( moduleInstance.view );

					hub.trigger('loaded:module', moduleInstance);
					count--;
					if(count == 0){
						hub.trigger('initialized:app');
					}
				});
			})

			tabView.active(modules[0]);
		}
		else{
			var menu = require('./Modules/Menu').getInstance();
			$(this).append(menu.view.$el);
		}
	})

	// disable default drag event
	document.body.addEventListener('dragover', function(e){
		e.stopPropagation();
		e.preventDefault();
	});
	document.body.addEventListener('drop', function(e){

		e.preventDefault();
		e.stopPropagation();
	})

	hub.on('export:project', function(){

		var projectAssets = require('./Modules/Project').getInstance().toJSON();

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

		var project = require('./Modules/Project').getInstance();
		var projectAssets = project.toJSON(['geometry', 'material', 'texture']);
		
		var scene = require('./Modules/Scene').getInstance();
		projectAssets.scene = project.nodeToJSON( scene.scene );
		projectAssets['activeCamera'] = scene.getActiveCamera().name;
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

})

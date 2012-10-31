//==========================
// Hierarchy.js
// 场景对象层级
//==========================
define(function(require, exports, module){
	
	var UIBase = require('../Core/UIBase/index');
	UIBase.Mixin = require('../Core/UIBase/Mixin/index');
	var hub = require('../Core/Hub').getInstance();
	var Assets = require('../Core/Assets/index');
	var FS = Assets.FileSystem;

	var view,
		treeView,
		// save scene;
		scene;

	function getInstance(){
		if(view){
			return {
				view : view
			}
		}

		view = new UIBase.Panel.View;
		view.setName('Hierarchy');
		view.$el.attr('id', 'Hierarchy');

		UIBase.Mixin.Scrollable.applyTo( view );

		treeView = new UIBase.Tree.View;
		treeView.root.owner = 'scene';
		
		view.appendView( treeView );

		handleHubEvent();
		initTreeView();

		return {
			view : view
		}
	}

	function handleHubEvent(){
		hub.on('created:scene', function(_scene){
			scene = _scene;

			treeView.model.set('json', [{
				type : 'folder',	
				name : scene.name,
				icon : 'icon-node icon-small'
			}])
			_.extend(treeView.find('/'+scene.name).acceptConfig, acceptConfig.node);
		})
		// update scene
		hub.on('added:node', function(node, parent){
			var path = Assets.Util.getSceneNodePath(parent);
			var treeNode = treeView.find(path);
			
			// recursive add 
			function walk(sceneNode, treeParent){
				var treeNode = createTreeNode(sceneNode);
				treeParent.add(treeNode, true);
				_.each(sceneNode.children, function(_node){
					walk(_node, treeNode);
				})
			}

			walk(node, treeNode);
		})
		// select object
		hub.on('selected:node', function(node){
			// need to be silent to prevent recursive event call
			treeView.select( Assets.Util.getSceneNodePath(node), false, true );
		})
		hub.on('removed:node', function(node){
			treeView.remove( Assets.Util.getSceneNodePath(node), true );
		})
	}

	var acceptConfig = {
		'node' : {
			'prefab' : {
				accept : function(json){
					if( ! (json instanceof FileList) ){
						// data from project assets
						if(json.owner == 'project' && json.dataType == 'prefab'){
							return true;
						}
					}
				}, 
				accepted : function(json){
					var node = FS.root.find(json.dataSource).data.getInstance();
					var parentNode = Assets.Util.findSceneNode( this.getPath(), scene );
					hub.trigger('add:node', node, parentNode );
				}
			}
		}
	}

	function initTreeView(){

		treeView.on('moved:node', function(parent, parentPrev, node){
			var sceneNode = Assets.Util.findSceneNode( parentPrev.getPath() + '/' + node.name, scene );
			hub.trigger('add:node', sceneNode, parent.getPath(), true );
		})

		treeView.on('selected:node', function(node){
			var sceneNode = Assets.Util.findSceneNode( node.getPath(), scene);
			hub.trigger('select:node', sceneNode );
		})
	}

	function createTreeNode( sceneNode ){
		if( sceneNode instanceof THREE.Camera ){
			var node = new UIBase.Tree.File(sceneNode.name);
			node.icon = 'icon-small icon-camera';
		}
		else if( sceneNode instanceof THREE.Light ){
			var node = new UIBase.Tree.File(sceneNode.name);
			node.icon = 'icon-small icon-light';
		}
		else if( sceneNode instanceof THREE.Mesh ){
			var node = new UIBase.Tree.File(sceneNode.name);
			node.icon = 'icon-small icon-node';
		}
		else if( sceneNode instanceof THREE.Object3D ){
			var node = new UIBase.Tree.Folder(sceneNode.name);
			node.icon = 'icon-small icon-node';
			_.extend(node.acceptConfig, acceptConfig.node);

		}
		return node;
	}


	return {
		getInstance : getInstance
	}
})
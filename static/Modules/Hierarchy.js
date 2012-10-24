//==========================
// Hierarchy.js
// 场景对象层级
//==========================
define(function(require, exports, module){
	
	var UIBase = require('../UIBase/index');
	UIBase.Mixin = require('../UIBase/Mixin/index');
	var hub = require('./Hub').getInstance();
	var Assets = require('./Assets/index');

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
		})
		// update scene
		hub.on('added:node', function(node, parent){
			var path = Assets.Util.getSceneNodePath(parent);
			var treeNode = treeView.find(path);
			
			// recursive add 
			function walk(sceneNode, treeParent){
				var treeNode = createTreeNode(sceneNode);
				treeParent.add(treeNode);
				_.each(sceneNode.children, function(_node){
					walk(_node, treeNode);
				})
			}

			walk(node, treeNode);
		})
		// select object
		hub.on('selected:node', function(node){
			treeView.select( Assets.Util.getSceneNodePath(node) );
		})
		hub.on('removed:node', function(node){
			treeView.remove( Assets.Util.getSceneNodePath(node) );
		})
	}

	function initTreeView(){

		treeView.on('moved:node', function(parent, parentPrev, node){
			var sceneNode = Assets.Util.findSceneNode( parentPrev.getPath() + '/' + node.name, scene );
			hub.trigger('add:node', sceneNode, parent.getPath(), true );
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
		}
		return node;
	}


	return {
		getInstance : getInstance
	}
})
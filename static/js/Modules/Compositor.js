//========================
//Compositor.js
//后期合成编辑器
//========================
define(function(require, exports, module){
	
	var Nodes = require('./Nodes/index');
	Nodes.Input = require('./Nodes/Input/index');
	var Panel = require('../Core/UIBase/Panel');
	var svg = require('../Core/svg');
	var hub = require('../Core/Hub').getInstance();

	var view;
	var svgDom;

	function getInstance(){
		if(view){
			return {
				view : view
			}
		}

		view = new Panel.View;
		view.setName('Compositor');
		view.$list.css('position', 'relative');
		view.$el.attr('id', 'Compositor');

		handleHubEvent();

		// main workspace
		var $workspace = $('<div id="CompositorWorkspace"></div>');
		$workspace.css({
			'position' : 'absolute',
			'left': '0px',
			'top' : '0px'
		});
		view.$el.append($workspace);
		// svg context
		svgDom = svg.create('svg');
		view.el.appendChild(svgDom);

		// exec
		setInterval(function(){
			Nodes.Base.exec();
		}, 1000);

		return {
			view : view
		}
	}

	function handleHubEvent(){
		
		hub.on('create:node', function(type){
			var node = nodes[type]();
			$('#CompositorWorkspace').append(node.view.$el);
			node.view.$el.css({
				'left' : 400,
				'top' : 200
			})

			hub.trigger('created:node', node);
		})

		hub.on('created:link', function(linkView){
			linkView.render(svg);
			svgDom.appendChild(linkView.el);
		})
	}

	function updateScene(){
		// clean the buffer
	}

	var nodes = {
		'timer' : (function(){
			var slot = 0;
			return function(){
				var node = new Nodes.Input.Timer.Node( 'Timer'+(slot++) );
				return node;
			}
		})(),
		'scene' : (function(){
			var slot = 0;
			return function(){
				var sceneLayer = require('./Scene').getInstance();
				var node = new Nodes.Input.Scene.Node( 'Scene'+(slot++), sceneLayer.renderer, sceneLayer.scene, sceneLayer.getActiveCamera() );
				hub.on('actived:camera', function(camera){
					node.camera = camera;
				})
				return node;
			}
		})(),
		'viewer' : (function(){
			var slot = 0;
			return function(){
				var sceneLayer = require('./Scene').getInstance();
				var node = new Nodes.Viewer.Node('Viewer'+(slot++), sceneLayer.renderer);
				return node;
			}
		})()
	}

	return {
		getInstance : getInstance
	}
})
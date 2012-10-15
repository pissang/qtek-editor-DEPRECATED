//=======================
// Scene.js
// 场景节点
//=======================
define(['../Base', '../../UI/Label'], function(require, exports){

	var Base = require('../Base');
	var Label = require('../../UI/Label');
	
	var Node = function(name, renderer, scene, camera){

		Base.Node.call(this, name);

		this.renderer = renderer;
		this.scene = scene;
		this.camera = camera;

		this.colorRenderTarget = new THREE.WebGLRenderTarget( 512, 512 );
		this.normalRenderTarget = new THREE.WebGLRenderTarget( 512, 512 );
		this.depthRenderTarget = new THREE.WebGLRenderTarget( 512, 512);

		this.outputs = {
			'color' : function(){
				return this.colorRenderTarget;
			},
			'normal' : function(){
				return this.normalRenderTarget;
			},
			'depth' : function(){
				return this.depthRenderTarget;
			}
		}
	}

	Base.Node.inherit(Node, {
		// @override
		init : function(){
			var self = this;
			// 调用父节点的init函数
			Base.Node.prototype.init.call(this);

			// output color
			var colorView = new Label.View;
			colorView.model.set({
				name : 'color',
				value : 'color'
			})
			// 先放到参数层里
			this.parameterLayerView.appendView(colorView);

			// output normal
			var normalView = new Label.View;
			normalView.model.set({	
				name : 'normal',
				value : 'normal'
			})
			this.parameterLayerView.appendView(normalView);

			//output depth
			var depthView = new Label.View;
			depthView.model.set({
				name : 'depth',
				value : 'depth'
			})
			this.parameterLayerView.appendView(depthView);

			this.outputPins.add([{
				name : 'color'
			},
			{
				name : 'normal'
			},
			{
				name : 'depth'
			}])

		},

		exec : function(){
			THREE.SceneUtils.traverseHierarchy(this.scene, function(node){
				if(node.__helper__){
					node.visible = false;
				}
			})
			if( ! this.camera){
				return;
			}
			// color pass;
			if( this.outputLinks.where({sPin:'color'}).length ){
				this.renderer.render(this.scene, this.camera, this.colorRenderTarget, true);	
			}
			// normal pass;
			if( this.outputLinks.where({sPin:'normal'}).length ){
				this.scene.overrideMaterial = new THREE.MeshNormalMaterial();
				this.renderer.render(this.scene, this.camera, this.normalRenderTarget, true);
			}
			// depth pass;
			if(this.outputLinks.where({sPin:'depth'}).length ){
				this.scene.overrideMaterial = new THREE.MeshDepthMaterial();
				this.renderer.render(this.scene, this.camera, this.depthRenderTarget, true);
			}
				
			// reset
			this.scene.overrideMaterial = null;

			THREE.SceneUtils.traverseHierarchy(this.scene, function(node){
				if(node.__helper__){
					node.visible = true;
				}
			})
		}
	})

	return {
		Node : Node
	}
})
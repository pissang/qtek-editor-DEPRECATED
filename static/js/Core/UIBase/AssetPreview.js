//===================
//	Preview.js
//	preview asset
//===================
define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			path : '',			//asset path
			target : null		//object to preview
		}
	})

	var View = Backbone.View.extend({

		type : 'PREVIEW',

		tagName : 'div',
		
		className : 'lblend-preview',

		template : '<label class="lblend-preview-label">{{name}}</label>\
					<div class="lblend-preview-path"></div>\
					<div class="lblend-preview-viewport"><canvas /></div>',

		noPathTemplate : '<div class="lblend-preview-nopath">NONE</div>',

		renderInterval : 0,

		resizeInterval : 0,

		renderer : null,

		camera : null,

		scene : null,

		$canvas : null,

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}

			this.on('dispose', function(){
				clearInterval(this.renderInterval);
				clearInterval(this.resizeInterval);
			}, this)

			this.model.on('change:path', function(){
				this.updatePath();
			}, this);

			this.render();
		},

		render : function(){
			var self = this;
			
			this.$el.html( _.template(this.template, {
				name : this.name
			} ) );
			this.updatePath();

			this.renderer = new THREE.WebGLRenderer({
				canvas : this.$el.find('canvas')[0]
			});
			this.scene = new THREE.Scene();

			this.setUpCamera();

			this.prepareScene();

			if(this.renderInterval){
				clearInterval(this.renderInterval);
			}
			if(this.resizeInterval){
				clearInterval(this.resizeInterval);
			}
			this.renderInterval = setInterval(function(){
				
				self.renderer.render(self.scene, self.camera);
			}, 20);

			this.$canvas = this.$el.find('.lblend-preview-viewport canvas');
			
			this.autoResize();
			this.resizeInterval = setInterval(function(){
				self.autoResize()
			}, 100)

		},

		setUpCamera : function(){
			this.camera = new THREE.PerspectiveCamera( 60, 1, 0.01, 10 );
			this.camera.position.set(0.4, 0.4, 1.6);
			this.camera.lookAt(new THREE.Vector3(0, 0, 0));
		},

		autoResize : function(){
			var canvas = this.renderer.domElement,
				width = this.$canvas.width(),
				height = this.$canvas.height();

			if( width != canvas.width ||
				height != canvas.height){
				this.renderer.setSize(width, height);
				this.camera.aspect = width/height;
				this.camera.updateProjectionMatrix();
			}
		},

		updatePath : function(){
			var path = this.model.get('path');
			if( ! path){
				path = this.noPathTemplate;
			}
			this.$el.find('.lblend-preview-path').html(path)
		},

		setName : function(name){
			this.$el.children('label').html(name);
			this.name = name;
		},

		prepareScene : function(){
			var dirLight = new THREE.DirectionalLight(0xffffff);
			dirLight.position = new THREE.Vector3(2,2,2);
			this.scene.add(dirLight);
		}
	})

	exports.View = View;
	exports.Model = Model;

	Model.prototype.__viewconstructor__ = View;
})
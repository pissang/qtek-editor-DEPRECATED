//===================
//	Preview.js
//	preview asset
//===================
define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			target : null		//object to preview
		}
	})

	var View = Backbone.View.extend({

		type : 'PREVIEW',

		tagName : 'div',

		className : 'lblend-preview',

		template : '<label class="lblend-preview-label">{{name}}</label>\
					<canvas />',

		renderInterval : 0,

		renderer : null,

		camera : null,

		scene : null,

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}

			this.on('dispose', function(){
				clearInterval(this.renderInterval);
			}, this)

			this.render();
		},

		render : function(){
			var self = this;
			
			this.$el.html( _.template(this.template, {
				name : this.name
			} ) );
			
			if(this.renderInterval){
				clearInterval(this.renderInterval);
			}
			this.renderer = new THREE.WebGLRenderer({
				canvas : this.$el.find('canvas')[0]
			});
			this.camera = new THREE.PerspectiveCamera( 60, 1, 0.01, 10 );
			this.camera.position.set(0.4, 0.4, 1.6);
			this.camera.lookAt(new THREE.Vector3(0, 0, 0));
			this.scene = new THREE.Scene();

			this.prepareScene();

			this.renderInterval = setInterval(function(){
				
				self.renderer.render(self.scene, self.camera);
			}, 20);

		},

		setName : function(name){
			this.$el.children('label').html(name);
			this.name = name;
		},

		prepareScene : function(){

		}
	})

	exports.View = View;
	exports.Model = Model;

	Model.prototype.__viewconstructor__ = View;
})
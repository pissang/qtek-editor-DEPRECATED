//===================
// MaterialPreview.js
// preview material
//===================
define(function(require, exports, module){

	var Preview = require('./Preview');

	var Model = Preview.Model.extend();

	var View = Preview.View.extend({

		initialize : function(){
			if( ! this.model){
				this.model = new Model;
			}
			Preview.View.prototype.initialize.call(this);
		},

		mesh : null,

		prepareScene : function(){
			var geo = new THREE.SphereGeometry(0.73, 10, 10);
			this.mesh = new THREE.Mesh(geo, this.model.get('target'));

			this.model.off('change:target', updateMaterial);
			this.model.on('change:target', updateMaterial);

			this.scene.add(this.mesh);
		},

		updateMaterial : function(model, value){

			this.mesh.material = value;
		}
	})

	exports.Model = Model;

	exports.View = View;

	Model.prototype.__viewconstructor__ = View;
})
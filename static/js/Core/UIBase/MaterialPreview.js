//===================
// MaterialPreview.js
// preview material
//===================
define(function(require, exports, module){

	var Preview = require('./AssetPreview');

	var Model = Preview.Model.extend();

	var View = Preview.View.extend({

		className : 'lblend-material-preview',

		initialize : function(){
			if( ! this.model){
				this.model = new Model;
			}

			this.model.on('change:target', function(){
				this.updateMaterial()
			}, this);

			Preview.View.prototype.initialize.call(this);
		},

		mesh : null,

		prepareScene : function(){

			Preview.View.prototype.prepareScene.call(this);

			var geo = new THREE.SphereGeometry(0.73, 50, 50);
			this.mesh = new THREE.Mesh(geo, this.model.get('target'));

			this.scene.add(this.mesh);
			this.updateMaterial();
		},

		updateMaterial : function(){
			var mat = this.model.get('target');
			if( ! mat ){
				// default material
				this.mesh.material = new THREE.MeshLambertMaterial();

			}else{
				this.mesh.material = mat;
			}
		}

	})

	exports.Model = Model;

	exports.View = View;

	Model.prototype.__viewconstructor__ = View;
})
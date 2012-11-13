//=================
// Label.js
// 
//=================
define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			value : ''
		}
	})

	var View = Backbone.View.extend({

		type : 'LABEL',

		tagName : 'div',

		className : 'lblend-label',

		model : null,

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}
			var self = this;

			this.model.on('change:value', function(model, value){
				self.$el.html(value);
			})
			this.render();
		},

		setName : function(name){
			this.name = name;
		},

		render : function(){
			var self = this;
			this.$el.html(this.model.get('value'));
		}
		
	})

	Model.prototype.__viewconstructor__ = View;
	
	return {
		Model : Model,
		View : View
	}
})
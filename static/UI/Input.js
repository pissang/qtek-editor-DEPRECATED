//=================
// Input.js
// 
//=================
define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			name : '',
			value : ''
		}
	})

	var View = Backbone.View.extend({

		type : 'INPUT',

		tagName : 'div',

		className : 'lblend-input',

		model : null,

		template : '<label class="lblend-input-label" data-html="model.name"></label><input type="text" data-value="model.value" />',

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}
			var self = this;

			this.render();
		},

		render : function(){
			var self = this;
			this.$el.html( this.template );
			rivets.bind( this.$el, { model : this.model } );
		}

	})

	Model.prototype.__viewconstructor__ = View;
	
	return {
		Model : Model,
		View : View
	}
})
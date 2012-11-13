//=================
// Input.js
// 
//=================
define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			value : ''
		}
	})

	var View = Backbone.View.extend({

		type : 'INPUT',

		tagName : 'div',

		className : 'lblend-input',

		model : null,

		template : '<label class="lblend-input-label">{{name}}</label>\
			<input type="text" data-value="model.value" />',

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}

			this.render();
		},

		setName : function(name){
			this.$el.children('label').html(name);
			this.name = name;
		},
		
		render : function(){
			var self = this;
			
			this.$el.html( _.template(this.template, {
				name : this.name
			} ) );

			rivets.bind( this.$el, { model : this.model } );
		}

	})

	Model.prototype.__viewconstructor__ = View;
	
	return {
		Model : Model,
		View : View
	}
})
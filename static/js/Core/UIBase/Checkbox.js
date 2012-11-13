//=================
// Checkbox.js
// Boolean value
//=================
define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			value : false	//boolean
		}
	})

	var View = Backbone.View.extend({

		type : 'CHECKBOX',

		tagName : 'div',

		className : 'lblend-checkbox',

		template : '<input type="checkbox" data-checked="model.value" data-name="model.name" />\
					<label class="lblend-checkbox-label">{{name}}</label>',

		model : null,

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}
			var self = this;
			
			this.render();
		},

		render : function(){
			var self = this;
			this.$el.html( _.template(this.template, {
				name : this.name
			} ));
			rivets.bind( this.$el, { model : this.model } );
		},

		setName : function(name){
			this.$el.children('label').html(name);
			this.name = name;
		}
		
	})

	Model.prototype.__viewconstructor__ = View;
	
	return {
		Model : Model,
		View : View
	}
})
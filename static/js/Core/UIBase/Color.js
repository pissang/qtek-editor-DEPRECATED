//===================================
// Color.js
// http://bgrins.github.com/spectrum/
//===================================
define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			color : 0	//hex string
		}
	})

	var View = Backbone.View.extend({

		type : 'COLOR',

		tagName : 'div',

		className : 'lblend-color',

		template : '<label class="lblend-color-label">{{name}}</label>\
						<div class="lblend-color-picker">\
							<input type="text" data-value="model.color"/>\
						</div>',

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}

			this.render();

			this.on('dispose', function(){
				this.$input.spectrum("destroy");
			}, this);
			this.model.on('change:color', function(model, value){
				this.$input.spectrum('set', value);
			}, this)
		},

		$input : null,

		render : function(){
			var self = this;

			this.$el.html( _.template(this.template, {
				name : this.name
			} ) );

			rivets.bind(this.$el, {model : this.model});

			var $input = this.$el.find('.lblend-color-picker input');
			$input.spectrum({
				clickoutFiresChange : true,
				showButtons : false,
				showInput : true,
				preferredFormat : 'hex'
			});

			this.$input = $input;
		},

		setName : function(name){
			this.$el.children('label').html(name);
			this.name = name;
		}
		
	})

	return {
		Model : Model,
		View : View
	}
})
//======================================
// Button.js
// 按钮组件
//======================================

define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			label : ''
		}
	})

	var View = Backbone.View.extend({

		tagName : 'div',

		className : 'lblend-button',

		template : '<button className="lblend-common-button" data-html="model.label"></button>',

		model : null,

		initialize : function(){
			if( ! this.model){
				this.model = new Model;
			}
			this.render();
		},

		events : {
			'click button' : 'onclick'
		},

		setName : function(name){
			this.name = name;
		},

		render : function(){
			var self = this;

			self.$el.html(this.template);

			rivets.bind( this.$el, { model : this.model } );
		}, 

		onclick : function(){
			this.trigger('click');
		}
	})

	exports.View = View;

	exports.Model = Model;

	Model.prototype.__viewconstructor__ = View;
})
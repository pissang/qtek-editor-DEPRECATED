//=======================================
//	Image.js
//	
//=======================================

define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			filename : '',	//文件位置
			src : null	//HTMLImageElement
		}
	});

	var View = Backbone.View.extend({

		type : 'IMAGE',

		tagName : 'div',

		className : 'lblend-image',

		template : '<label class="lblend-image-label">{{name}}</label>\
					<span class="lblend-image-filename" data-html="model.filename"></span>\
					<div class="lblend-image-wrapper">\
						<img data-src="model.src" />\
					</div>',

		model : null,

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}

			this.render();

			this.on('dispose', function(){
			})
		},

		render : function(){

			this.$el.html( _.template(this.template, {
				name : this.name
			} ) );
			
			rivets.bind(this.$el, {model:this.model});
			
		},

		setName : function(name){
			this.$el.children('label').html(name);
			this.name = name;
		}

	})

	exports.View = View;

	exports.Model = Model;

	Model.prototype.__viewconstructor__ = View;
})
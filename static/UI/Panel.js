//============================================
// Panel.js
//============================================

define(function(require, exports, module){

	var Layer = require('./Layer');

	var Collection = Layer.Collection.extend({
	});

	var View = Layer.View.extend({

		type : 'PANEL',

		tagName : 'div',

		className : 'lblend-panel',

		template : '<h5 class="lblend-panel-label">{{label}}</h5><div class="lblend-list"></div>',

		collection : null,

		render : function(){

			var self = this;

			//调用父类的渲染程序
			Layer.View.prototype.render.call(this);

		},

		setName : function(name){
			this.collection.name = name;
			this.$el.find('h5.lblend-panel-label').html(name);
		}
	});

	exports.Collection = Collection;

	exports.View = View;

	Collection.prototype.__viewconstructor__ = View;

})
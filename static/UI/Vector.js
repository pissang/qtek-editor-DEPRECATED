//===============================================
// Vector.js
// 多个Float组件组成的向量编辑组件，尽管用collection作数据源，但是像Float一样也是一个原子组件
//===============================================

define(['./Float'], function(require, exports, module){

	var Float = require('./Float');

	//
	//Float.Model的collection集合，需要自己定义label或name属性，
	//name属性是该组件的标识符，再有父组件做管理的时候作为唯一标识符
	//label属性是该组件的显示名称
	//
	var Collection = Backbone.Collection.extend({
		name : '',
		model : Float.Model
	})

	var View = Backbone.View.extend({

		type : 'VECTOR',

		tagName : 'div',

		className : 'lblend-vector',

		collection : null,

		labelTemplate : '<label class="lblend-vector-label">{{label}}</label><div class="lblend-list"></div>',

		initialize : function(){
			if(! this.collection){
				this.collection = new Collection;
			}
			var self = this;
			this.collection.on('add', function(model){
				var view = new Float.View({
					model : model
				});
				self.$el.children('.lblend-list').append(view.$el);
			})

			this.render();
		},

		render : function(){
			
			var self = this;

			self.el.innerHTML = _.template(this.labelTemplate, {

				label : this.collection.label || this.collection.name || ''
			});
			
			var $list = self.$el.children('.lblend-list');

			//创建并且渲染Float组件
			self.collection.forEach(function(model, index){
				
				var view = new Float.View({
					model : model
				});
				view.render();
				$list.append(view.$el);
			})
		},
		// 因为Vector是使用collection，所以不能观察name的变化
		// 这里只能加一个setName方法设置，不知道有木有更好的办法
		setName : function(name){
			this.collection.name = name;
			this.$el.find('label.lblend-vector-label').html(name);
		}
	})

	exports.Collection = Collection;

	exports.View = View;

	Collection.prototype.__viewconstructor__ = View;
})
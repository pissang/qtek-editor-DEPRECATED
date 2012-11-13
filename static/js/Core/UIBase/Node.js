//============================================
// Node.js
// 节点编辑器的节点组件，继承自Layer组件，但是提供了更详细的样式和交互
// 依赖jquery ui提供拖拽的交互
// 关闭节点的触发close事件
// todo 加入resizable
//============================================

define(function(require, exports, module){
	var Layer = require('./Layer');

	var Collection = Layer.Collection.extend();

	var View = Layer.View.extend({

		className : 'lblend-node',

		template : '<h5 class="lblend-node-label">{{name}}</h5><div class="lblend-list"></div><div class="lblend-close" title="close"></div>',

		collection : null,

		initialize : function(){

			if( ! this.collection){
				this.collection = new Collection;
				Layer.View.prototype.initialize.call(this);
			}
		},

		render : function(){

			var self = this;

			//调用父类的渲染程序
			Layer.View.prototype.render.call(this);

			//使用jquery ui提供拖拽的交互
			this.$el.draggable({
				// scroll : true,
				scrollSensitivity: 40,
				stack : '.lblend-node',
				scrollSpeed : 60,
				opacity: 0.5,
				handle : 'h5',
				cursor: "move",
				drag : function(){
					self.trigger('drag')
				},
				start : function(){
					self.trigger('dragstart')
				}
			});
			this.$el.css('position', 'absolute');

			this.cachePinViews();

			this.$el.find('.lblend-close').click(function(){
				self.trigger('close');
			})
		},
		//缓存InputPinView和OutputPinView
		cachePinViews : function(){

			this._inputPinViews = this.findByType('INPUTPIN');
			this._outputPinViews = this.findByType('OUTPUTPIN');
		}

	});

	exports.View = View;

	Collection.prototype.__viewconstructor__ = View;

})
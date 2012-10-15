//=================================
// Pin.js
// 为一些参数组件中添加一个端口
//=================================
define(function(require, exports, module){

	exports.applyTo = function(view){

		var self = this;
		// 加上mixin的tag，预防冲突，也方便查找
		if( ! view.mixin){
			view.mixin = [];
		}
		if(_.indexOf(view.mixin, self.tag) >= 0){
			return;
		}
		view.mixin.push(self.tag);
		
		var $pin;

		function init(){

			$pin = $(_.template('<div class="{{className}}"></div>' , {
				
				className : self.className
			}));
		}
		// 插入dom
		function update(){

			if(view.$el.css('position') != 'absolute'){

				view.$el.css('position', 'relative');
			}
			
			view.$el.append($pin);
		}

		init();
		update();

		// 保存原先的render函数
		var renderPrev = view.render;
		_.extend(view, {

			$pin : $pin,
			// 每次render 的时候重新插入dom
			render : function(){
				// 
				renderPrev.call(view);
				
				update()
			},
			// 获取pin的位置
			getPosition : function(pOffset){

				var	offset = $pin.offset(),
					pOffset = pOffset || {left : 0, top : 0},
					width = $pin.width(),
					height = $pin.height();

				return {
					left : offset.left - pOffset.left + width/2,
					top : offset.top - pOffset.top + height/2
				}
			},
			// 移除这个mixin
			back : function(){
				delete this.$pin;
				delete this.getPosition;
				//删除pin
				$pin.remove();
				view.render = renderPrev;
			}
		})
	}

	exports.className = 'lblend-pin';

	exports.tag = 'PIN';
})
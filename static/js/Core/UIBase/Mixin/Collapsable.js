//=====================
// Collapsable.js
// 可以折叠，主要针对LayerView
//=====================
define(function(require, exports, module){

	exports.applyTo = function(view){

		var self = this;
		if( ! view.mixin){
			view.mixin = [];
		}
		if(_.indexOf(view.mixin, self.tag) > 0){
			return;
		}
		view.mixin.push(self.tag);

		// 展开折叠的按钮
		var $button = $(_.template('<div class="{{className}}"></div>"', {
				className : self.className
			}));

		function update(){
			var $label = view.$el.children('h5');
			if( ! $label.length){
				$label = view.$el.children('label');
			}
			if($label.css('position') != 'absolute'){
				$label.css('position', 'relative');
			}
			$label.append($button);
			$label.css('padding-left', '20px');

			$label.bind('click', view.toggle);
			$button.addClass(view.collapase ? 'fold' : 'unfold');

			var $list = view.$el.children('.lblend-list');
			$list.css({
				'overflow-y':'hidden'
			})
		}

		// 保存原先的render函数
		var renderPrev = view.render;
		_.extend(view, {

			collapse : false,

			render : function(){
				renderPrev.call(view);

				update();

			},

			toggle : function(){
				if( view.collapase){
					view.unfold();
				}
				else{
					view.fold();
				}
			},

			fold : function(){
				this.$el.find('.lblend-list').slideUp();
				$button.removeClass('unfold');
				$button.addClass('fold');
				this.collapase = true;
			},

			unfold : function(){
				this.$el.find('.lblend-list').slideDown();
				$button.addClass('unfold');
				$button.removeClass('fold');
				this.collapase = false;
			},

			back : function(){
				var $label = view.$el.children('label');
				$button.remove();
				view.render = renderPrev;
				delete view.collapse;
				delete view.toggle;
				delete view.fold;
				delete view.unfold;
			}

		})

		update();

	}

	exports.className = 'lblend-collapsable';

	exports.tag = 'COLLAPSABLE'
})
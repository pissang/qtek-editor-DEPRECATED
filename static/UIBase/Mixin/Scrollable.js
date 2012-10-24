//=====================
// Scrollable.js
// 自定义滚动，主要针对LayerView, 滚动的时候LayerView中的label不动,改变list的top值
// todo 加入滚轮的scroll
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

		var $scrollbarX = $('<div class="lblend-scrollbar-x"><div class="lblend-scrollbar-thumb"></div></div>'),
			$scrollbarY = $('<div class="lblend-scrollbar-y"><div class="lblend-scrollbar-thumb"></div></div>'),
			$scrollbarXThumb = $scrollbarX.find('.lblend-scrollbar-thumb'),
			$scrollbarYThumb = $scrollbarY.find('.lblend-scrollbar-thumb');

		$scrollbarX.mousewheel(function(e, delta){
			e.stopPropagation();
			stepX(delta*20);
		})
		
		$scrollbarY.mousewheel(function(e, delta){
			e.stopPropagation();
			stepY(delta*20);
		})
		
		var renderPrev = view.render;

		// listOriginPosition是list原先的位置
		var $list, $label, listOriginPosition;
		// clientWidth, clientHeight是显示的大小
		// overviewWidth, overviewHeight是文档实际的大小
		var percentX, percentY, clientWidth, clientHeight, overviewWidth, overviewHeight;

		$scrollbarXThumb.draggable({
			'axis' : 'x',
			'containment' : 'parent',
			'drag' : function(e, ui){
				var left = ui.position.left,
					thumbWidth = $scrollbarXThumb.width(),
					barWidth = $scrollbarX.width();

				if( barWidth > thumbWidth){
					var percent = left / ( barWidth - thumbWidth);

					updateOverviewXPercent(percent);
				}
			}
		});
		$scrollbarYThumb.draggable({
			'axis' : 'y',
			'containment' : 'parent',
			'drag' : function(e, ui){
				var top = ui.position.top,
					thumbHeight = $scrollbarYThumb.height(),
					barHeight = $scrollbarY.height();

				if( barHeight > thumbHeight){
					var percent = top / ( barHeight - thumbHeight);

					updateOverviewYPercent(percent);
				}
			}
		});

		var monitorInstance;

		view.on('dispose', function(){
			if( monitorInstance ){
				clearInterval(monitorInstance);
			}
		})
		function render(){
			view.$el.css('overflow', 'hidden');

			$list = view.$el.children('.lblend-list');
			$label = view.$el.children('h5');
			
			listOriginPosition = {
				top : $list.position().top,
				left : $list.position().left
			}
			//todo 在$el有padding的时候为什么position的left和top还都是0？

			view.$el.append($scrollbarX);
			view.$el.append($scrollbarY);

			if( monitorInstance ){
				clearInterval( monitorInstance );
			}
			// 有没有别的更好的办法 ?
			setInterval(function(){	
				update();
			}, 500);

			view.$el.mousewheel(function(e, delta){
				stepY(delta*20);
			})
		}

		function update(){

			clientHeight = view.$el.height() - listOriginPosition.top;
			clientWidth = view.$el.width();

			overviewWidth = $list.width();
			overviewHeight = $list.height();

			percentX = clientWidth / overviewWidth;
			percentY = clientHeight / overviewHeight;

			if( percentX >= 1){
				$scrollbarX.css('display', 'none');
			}
			else{
				$scrollbarX.css('display', 'block');
				$scrollbarXThumb.width( percentX * view.$el.width() );
			}
			if( percentY >= 1){
				$scrollbarY.css('display', 'none');
			}else{
				$scrollbarY.css('display', 'block');
				$scrollbarYThumb.height( percentY * view.$el.height() );
			}

		}

		// y方向上滚动一定距离
		function stepY(step){
			var top = $list.position().top+step,
				percent = Math.abs( top/(overviewHeight-clientHeight) );

			if( top >= listOriginPosition.top ){
				percent = 0;
			}
			if( percent >= 1){
				percent = 1;
			}
			updateScrollbarYPercent(percent);
			updateOverviewYPercent(percent);
		}

		function stepX(step){
			var left = $list.position().left+step,
				percent = Math.abs( left/(overviewWidth-clientWidth) );

			if( left >= listOriginPosition.left){
				left = listOriginPosition.left;
				percent = Math.abs( left/(overviewWidth-clientWidth) );
			}
			if( percent >= 1){
				percent = 1;
			}
			updateScrollbarXPercent(percent);
			updateOverviewXPercent(percent);
		}

		function updateScrollbarYPercent(percent){

			var thumbHeight = $scrollbarYThumb.height(),
				barHeight = $scrollbarY.height();
			var thumbTop = (barHeight-thumbHeight)*percent;
			$scrollbarYThumb.css('top', thumbTop);
		}

		function updateOverviewYPercent(percent){
			var offsetTop = (overviewHeight - clientHeight) * percent,
				parentTop = view.$el.offset().top;

			$list.offset({
				'top': -offsetTop+listOriginPosition.top+parentTop
			});
		}

		function updateScrollbarXPercent(percent){

			var thumbWidth = $scrollbarXThumb.width(),
				barWidth = $scrollbarX.width();
			var thumbLeft = (barWidth-thumbWidth)*percent;
			$scrollbarXThumb.css('left', thumbLeft);
		}

		function updateOverviewXPercent(percent){
			var offsetLeft = (overviewWidth - clientWidth) * percent,
				parentLeft = view.$el.offset().left;

			$list.offset({
				'left': -offsetLeft+listOriginPosition.left+parentLeft
			});
		}

		_.extend(view, {

			render : function(){

				renderPrev.call(this);

				render();
			},

			back : function(){

			},

			scrollTo : scrollTo
		})

		render();
	}

	exports.className = 'lblend-scrollable';

	exports.tag = 'SCROLLABLE';

})
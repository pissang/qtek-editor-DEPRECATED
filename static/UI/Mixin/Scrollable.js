//=====================
// Scrollable.js
// 自定义滚动，主要针对LayerView
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
		
		var renderPrev = view.render;

		var $list, $label, listOriginPosition

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

					var offsetLeft = (overviewWidth - clientWidth) * percent;
					$list.css('left', -offsetLeft+listOriginPosition.left);

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

					var offsetTop = (overviewHeight - clientHeight) * percent;
					$list.css('top', -offsetTop+listOriginPosition.top);
				}
			}
		});

		var monitorInstance;

		view.on('expose', function(){
			if( monitorInstance ){
				clearInterval(monitorInstance);
			}
		})
		function render(){
			positionPrev = view.$el.css('position');
			if( positionPrev != 'absolute' ){
				view.$el.css('position', 'relative');
			}
			view.$el.css('overflow', 'hidden');

			$list = view.$el.children('.lblend-list');
			$label = view.$el.children('h5');
			
			listOriginPosition = {
				top : $list.position().top,
				left : $list.position().left
			}
			//todo 在$el有padding的时候为什么position的left和top还都是0？
			var labelPosition = {
				left : $label.position().left,
				top : $label.position().top
			}
			$label.css( { 
				'top' : labelPosition.top,
				'left' : labelPosition.left,
				'position': 'absolute',
				'z-index' : 1
			});
			$list.css( {
				'position' : 'absolute',
				'top' : listOriginPosition.top,
				'left' : listOriginPosition.left,
				'z-index' : 0
			});


			view.$el.append($scrollbarX);
			view.$el.append($scrollbarY);

			if( monitorInstance ){
				clearInterval( monitorInstance );
			}
			// 有没有别的更好的办法 ?
			setInterval(function(){	
				update();
			}, 500);

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

		function scrollTo(x, y){
			
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
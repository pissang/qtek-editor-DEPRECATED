//================
//	Acceptable.js
//================
define(function(require, exports, module){

	exports.applyTo = function(view){

		var self = this;
		if( ! view.mixin){
			view.mixin = [];
		}
		if(_.indexOf(view.mixin, self.tag) >= 0){
			return;
		}
		view.mixin.push(self.tag);

		function update(){

			view.$el[0].addEventListener('dragover', function(e){
				e.stopPropagation();
				e.preventDefault();

				$(this).addClass( exports.className + '-dragover');
			})

			view.$el[0].addEventListener('drop', function(e){
				e.stopPropagation();
				e.preventDefault();

				$(this).removeClass( exports.className + '-dragover');

				var data;
				if(e.dataTransfer.files.length){
					data = e.dataTransfer.files;
				}else{
					data = e.dataTransfer.getData('text/plain');
					if(data){
						data = JSON.parse( data );
					}
				}
				if(view.acceptConfig){
					_.each(view.acceptConfig, function(config){
						if( config.accept(data) ){
							config.accepted(data);
						}
					})
				}
			})

			view.$el[0].addEventListener('dragleave', function(e){
				e.stopPropagation();
				e.preventDefault();

				$(this).removeClass( exports.className + '-dragover');

			})
		}
		
		update();

		var renderPrev = view.render;

		_.extend(view, {

			render : function(){

				renderPrev.call(view);

				update();
			},

			acceptConfig : {

			}
		})	
	}

	exports.className = 'lblend-acceptable';

	exports.tag = 'ACCEPTABLE';
})
//============================================
//Video.js
//视频编辑组件
//============================================

define(function(require, exports, module){


	var Model = Backbone.Model.extend({

		defaults : {
			name : '',
			video : null	//VideoDomElement
		}
	});

	var View = Backbone.View.extend({

		type : 'VIDEO',

		model : null,

		tagName : 'div',

		className : 'lblend-video',

		template : '<label>{{label}}</label><br />',

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}

			this.model.on('change:video', function(){

				if(this.el){

					this.$el.find('video').remove();
					if( this.model.get('video')){

						this.el.appendChild(this.model.get('video'));
					}else{

						this.$el.append('<video class="lblend-video-default" />');
					}
				}
			}, this);

			this.model.on('change:name', function(){
				this.$el.find('label').html(this.model.get('name'));
			}, this)
			
			this.render();
		},

		render : function(){

			this.el.innerHTML = _.template(this.template, {
				label : this.model.get('name') || ''
			});
			if(this.model.get('video')){
				this.el.appendChild(this.model.get('video'));
			}else{

				this.$el.append('<video class="lblend-video-default" />');
			}
		}
	})

	exports.Model = Model;

	exports.View = View;

	Model.prototype.__viewconstructor__ = View;
})
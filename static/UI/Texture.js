//=======================================
//Texture.js
//纹理编辑组件
//=======================================

define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			name : '',
			texture : null	//ImgDomElement
		}
	});

	var View = Backbone.View.extend({

		type : 'TEXTURE',

		tagName : 'div',

		className : 'lblend-texture',

		template : '<label class="lblend-texture-label">{{label}}</label><br />',

		model : null,

		events : {
			'click label' : 'toggleCollapse'
		},
		
		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}

			this.model.on('change:texture', function(model, value){

				if(this.el){

					this.$el.find('img').remove();
					if( value ){

						this.el.appendChild( value );
					}else{

						this.$el.append('<img class="lblend-texture-default" />');
					}
				}
			}, this);

			this.model.on('change:name', function(model, value){

				this.$el.find('label').html( value );
			}, this)

			this.render();
		},

		render : function(){

			this.el.innerHTML = _.template(this.template, {

				label : this.model.get('name') || ''
			});
			if(this.model.get('texture')){

				this.el.appendChild(this.model.get('texture'));
			}else{
				
				//插入默认的棋盘格图片
				this.$el.append('<img class="lblend-texture-default" />');
			}
		},

		toggleCollapse : function(){

			this.$el.find('img').toggle();
		}
	})

	exports.View = View;

	exports.Model = Model;

	Model.prototype.__viewconstructor__ = View;
})
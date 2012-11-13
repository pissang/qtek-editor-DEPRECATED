//======================================
// Float.js
// Float类型参数编辑组件
// todo 加入没有最大和最小值的情况
//=======================================

define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			value : 0,
			min : -100000,
			max : 100000,
			step : 0
		},
		initialize : function(){
			this.on('change:value', function(){
				if(_.isNaN(this.get('value'))){
					this.set('value', 0);
				}
				if(this.get('value') < this.get('min') ){
					this.set('value', this.get('min'))
				}
				if(this.get('value') > this.get('max') ){
					this.set('value', this.get('max'))
				}
			}, this);

			this.on('change:min', function(){
				if(this.get('min') > this.get('max')){
					this.set('min', this.get('max'));
				}
				if(this.get('min') > this.get('value')){
					this.set('value', this.get('min'));
				}
			})

			this.on('change:max', function(){
				if(this.get('min') > this.get('max')){
					this.set('max', this.get('min'));
				}
				if(this.get('max') < this.get('value')){
					this.set('value', this.get('max'));
				}
			})
		}
	});

	var View = Backbone.View.extend({
		
		//type 全部大写
		type : 'FLOAT',

		model : null,

		tagName : 'div',

		className : 'lblend-float',

		template : '<div class="lblend-percent"></div><label>{{label}}</label> <span>{{value}}</span>',

		editModeTemplate : '<div class="lblend-percent"></div><input type="text" value="{{value}}" />',

		editMode : false,

		name : '',

		events : {
			'click ' : 'enterEditMode',
			'mousedown ' : 'enterDragMode'
		},

		initialize : function(){
			if( ! this.model){
				this.model = new Model;
			}

			this.model.on('change:value', this.updateValue, this);
			this.model.on('change:max', this.updatePercent, this);
			this.model.on('change:min', this.updatePercent, this);
			
			this.render();
		},

		render : function(){

			if(this.editMode){

				this.$el.html(_.template(this.editModeTemplate, {
					value : Math.round(this.model.get('value')*1000)/1000
				}))
			}
			else{

				this.$el.html(_.template(this.template, {
					label : this.name,
					value : Math.round(this.model.get('value')*1000)/1000
				}));
			}
			//update the percent bar
			this.updatePercent();
		},

		setName : function(name){
			this.$el.children('label').html(name);
			this.name = name;
		},		

		updateValue : function(){

			if( this.editMode){

				this.$el.find('input').val(Math.round(this.model.get('value')*1000)/1000);
			}else{

				this.$el.find('span').html(Math.round(this.model.get('value')*1000)/1000);
			}
			this.updatePercent();
		},

		updatePercent : function(){

			var percent = (this.model.get('value') - this.model.get('min'))  / (this.model.get('max') - this.model.get('min'));
			this.$el.find('.lblend-percent').width(percent * 100+'%');
		},

		enterEditMode : function(){
			var self = this;

			if(this.editMode){
				return ;
			}
			this.editMode = true;
			this.render();

			var $input = this.$('input');
			$input.focus();

			//exit edit mode when blur
			$input.blur(function(){
				self.editMode = false;
				self.render();
			})
			//update the value
			$input.change(function(){
				self.model.set('value', parseFloat(this.value));
			})
		},

		enterDragMode : function(e){

			if( this.editMode){
				return true;
			}

			var self = this,
				oldX = e.pageX;

			function mouseMoveHandler(e){

				var x = e.pageX;
				var offsetX = x - oldX;
				self.model.set('value', self.model.get('value')+offsetX*self.model.get('step'));
				oldX = x;
			}

			function mouseUpHandler(e){

				$(document.body).unbind('mousemove', mouseMoveHandler);
				$(document.body).unbind('mouseup', mouseUpHandler);
				
			}

			$(document.body).bind('mousemove', mouseMoveHandler);

			$(document.body).mouseup('mouseup', mouseUpHandler);
		}

	});
	//
	//Float类型参数的编辑界面，支持拖拽调整大小，单击进行输入的交互
	//
	exports.View = View;

	exports.Model = Model;

	//这个Model对应的View
	Model.prototype.__viewconstructor__ = View;
})
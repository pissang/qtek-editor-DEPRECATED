//===================================
// Color.js
// use jquery color picker for color picking
// http://www.eyecon.ro/colorpicker/
//===================================
define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			name : '',
			color : 0	//hex value
		}
	})

	var View = Backbone.View.extend({

		type : 'COLOR',

		tagName : 'div',

		className : 'lblend-color',

		template : '<label class="lblend-color-label">{{label}}</label><div class="lblend-color-picker"></div>',

		initialize : function(){
			var self = this;
			this.model.on('change:name', function(model, name){
				self.$el.children('.lblend-color-label').html(name);
			})
			this.model.on('change:color', function(model, color, options){
				var $picker = self.$el.find('.lblend-color-picker');
				$picker.css({
					'background-color' : '#' + color.toString(16)
				})
				if(options.triggeronce){
					return;
				}
				$picker.ColorPickerSetColor(color);
			})

			this.render();
		},

		render : function(){
			var self = this;

			this.$el.html(_.template(this.template, {
				label : this.model.get('name')
			}))
			var $picker = this.$el.find('.lblend-color-picker');
			
			var color = this.model.get('color');
			$picker.ColorPicker({
				color : color.toString(16),	//不支持多种颜色格式实在是有点不爽
				onChange : function(hsb, hex, rgb){
					self.model.set('color', hex, {
						'triggeronce' : true
					});
				}
			})
			if( color ){
				$picker.css({
					'background-color' : '#' + color.toString(16)
				})
			}
		}
	})

	return {
		Model : Model,
		View : View
	}
})
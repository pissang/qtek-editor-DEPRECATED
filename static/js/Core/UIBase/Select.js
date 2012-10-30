//=================
// Select.js
// 提供change事件
//=================
define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults : {
			name : '',	//这里name对应option的value
			value : '',
			selected : false
		}
	});

	var Collection = Backbone.Collection.extend({
		
		select : function(name){
			this.forEach(function(model){
				if(model.get('name') == name){
					model.set('selected', true);
				}else{
					model.set('selected', false);
				}
			})
		}
	})

	var View = Backbone.View.extend({

		type : 'SELECT',

		tagName : 'div',

		className : 'lblend-select',

		template : '<label class="lblend-select-label">{{label}}</label><a class="lblend-select-button lblend-common-button"></a>',

		collection : null,

		events : {
			'click .lblend-select-button' : 'toggle'
		},

		inSelect : false,

		initialize : function(){

			if( ! this.collection){
				this.collection = new Collection;
			}
			var self = this;

			this.collection.on('add', this.add, this);
			this.collection.on('change:selected', function(item, value){
				if( value ){
					
					this.trigger('change', item);		
				}
			}, this)

			this.render();
		},

		render : function(){
			var self = this;
			this.$el.html(_.template(this.template, {
				label : this.collection.name || ''
			}));
			
		},

		add : function(model){
			if(this.collection.where({
				selected :true
			}).length == 0){
				this.select(model.get('name'));
			}
		},

		toggle : function(){
			if( this.inSelect){
				
				$('.lblend-select-dropdown-list').remove();
				this.inSelect = false;
			}else{

				var self = this;
				$('.lblend-select-dropdown-list').remove();
				
				$ul = $('<ul class="lblend-select-dropdown-list"></ul>');
				this.collection.forEach(function(model){
					$ul.append(self.createItem(model));
				});

				var $button = $('.lblend-select-button'),
				offset = $button.offset();
				$(document.body).append($ul);
				$ul.css({
					'position' : 'absolute'
				})
				$ul.offset({
					left : offset.left,
					top : offset.top+$button.outerHeight()+3
				})
				
				this.inSelect = true;
			}
		},

		createItem : function(model){
			var self = this;
			var $li = $('<li></li>');
			$li.data('name', model.get('name'));
			$li.html(model.get('value'));
			$li.click(function(){
				self.select(model.get('name'));
				self.toggle();
			});
			if(model.get('selected')){
				$li.addClass('selected');
			}
			return $li;
		},

		setName : function(name){
			this.collection.name = name;
			this.$el.children('label.lblend-select-label').html(name);
		},

		select : function(name){

			this.collection.select(name);

			var $ul = $('.lblend-select-dropdown-list'),
				$lis = $ul.children('li'),
				self = this;

			$lis.removeClass('selected');
			$ul.children('li').each(function(){
				var $this = $(this);
				if( $this.data('name') == name ){
					$this.addClass('selected');
				}
			})
			
			var model = this.collection.where({
				name : name
			})[0];
			if(model){
				this.$el.find('.lblend-select-button').html(model.get('value'));
			}
		}
		
	})

	Collection.prototype.__viewconstructor__ = View;

	return {
		Collection : Collection,
		View : View
	}
})
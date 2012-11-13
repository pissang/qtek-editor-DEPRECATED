//=========================
// Tab.js
// todo 是否需要重构一下？
//=========================
define(function(require, exports){

	var Layer = require('./Layer');

	var Collection = Layer.Collection.extend();

	var View = Backbone.View.extend({

		type : 'TAB',

		className : 'lblend-tab',

		template : '<ul class="lblend-tab-tabs"></ul>\
				<div class="lblend-list"></div>',

		tabs : null,

		initialize : function(){

			var self = this;
			// name active view
			this.tabs = new Backbone.Collection;

			this.tabs.on('add', function(tab){
				
				self.renderTabs();

				tab.on('change:active', function(){
					if(tab.get('active')){
						tab.get('$el').addClass('active');
						tab.get('view').$el.css('display', 'block');
					}else{
						tab.get('$el').removeClass('active');
						tab.get('view').$el.css('display', 'none');
					}
				})

				self.tabs.forEach(function(_tab){
					_tab.set('active', false);
				})
				tab.set('active', true);
			})

			this.tabs.on('remove', function(tab){
				self.renderTabs();
			})

			if( ! this.collection){
				this.collection = new Collection;
			}

			Layer.View.prototype.initialize.call(this)
		},

		render : function(){

			Layer.View.prototype.render.call(this);

			this.renderTabs();
		},

		renderTabs : function(){
			var self = this;
			var $tabs = this.$el.children('.lblend-tab-tabs');
			$tabs.html('');
			this.tabs.forEach(function(tab){

				var $el = $('<li>'+tab.get('name')+'</li>');
				$el.click(function(){
					self.active(tab.get('name'));
				})
				$tabs.append($el);
				tab.set('$el', $el);

			})
		},

		// _addModel : function(model){

		// 	Layer.View.prototype._addModel.call(this, model);

		// 	var view = _.last(this._views);

		// 	view.hideLabel();

		// 	this.tabs.add({
		// 		name : name,
		// 		active : false,
		// 		// 该标签对应的view
		// 		view : view
		// 	})
		// },

		// _removeModel : function(model){

		// 	Layer.View.prototype._removeModel.call(this, model);

		// 	this.tabs.remove(this.tabs.where({
		// 		name : name
		// 	})[0]);
		// },

		appendView : function(view){

			Layer.View.prototype.appendView.call(this, view);

			this.tabs.add({
				name : view.name,
				active : false,
				// 该标签对应的view
				view : view,
				// 该标签的dom
				$el : $('<li>'+name+'</li>')
			})
		},

		removeView : function(view){

			Layer.View.prototype.removeView.call(this, view);

			this.tabs.remove(this.tabs.where({
				name : view.name
			})[0]);
		},

		active : function(tabName){
			var activeView;
			this.tabs.forEach(function(tab){
				if(tab.get('name') == tabName){
					tab.set('active', true);
					activeView = tab.get('view');
				}else{
					tab.set('active', false);
				}
			});
			if(activeView && activeView.getMenuConfigs){

			}
		}

	})

	exports.View = View;

	Collection.prototype.__viewconstructor__ = View;
})
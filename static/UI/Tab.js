//=========================
// Tab.js
//=========================
define(['./Layer'], function(require, exports){

	var Layer = require('./Layer');

	var Collection = Layer.Collection.extend({});

	var View = Backbone.View.extend({

		className : 'lblend-tab',

		template : '<ul class="lblend-tab-tabs"></ul><div class="lblend-list"></div>',

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
					self.tabs.forEach(function(_tab){
						_tab.set('active', false);
					});
					tab.set('active', true);
				})
				$tabs.append($el);
				tab.set('$el', $el);

			})
		},

		_addModel : function(model){

			Layer.View.prototype._addModel.call(this, model);

			var view = _.last(this._views);

			view.hideLabel();

			var name = getModelName(model);

			this.tabs.add({
				name : name,
				active : false,
				// 该标签对应的view
				view : view
			})
		},

		_removeModel : function(model){

			Layer.View.prototype._removeModel.call(this, model);

			var name = getModelName(model);

			this.tabs.remove(this.tabs.where({
				name : name
			})[0]);
		},

		appendView : function(view){

			Layer.View.prototype.appendView.call(this, view);

			var name = getViewName(view);

			this.tabs.add({
				name : name,
				active : false,
				// 该标签对应的view
				view : view,
				// 该标签的dom
				$el : $('<li>'+name+'</li>')
			})
		},

		removeView : function(view){

			Layer.View.prototype.removeView.call(this, view);
		},

		active : function(tabName){
			this.tabs.forEach(function(tab){
				if(tab.get('name') == tabName){
					tab.set('active', true);
				}else{
					tab.set('active', false);
				}
			});
		}

	})

	// 判断是WrapperModel还是其它Model，并且获取其名字
	var	getModelName = function(model){
		var name;
		if(model instanceof Layer.WrapperModel){
			var coll = model.get('collection');
			name = coll.name;
		}else{
			name = model.get('name');
		}
		return name;
	}

	var getViewName = function(view){
		if(view.collection){
			return view.collection.name
		}else{
			return view.model.get('name')
		}
	}

	exports.Collection = Collection;

	exports.View = View;

	Collection.prototype.__viewconstructor__ = View;
})
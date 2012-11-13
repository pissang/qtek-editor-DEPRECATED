//=========================
// Layer.js
// 容器组件
// todo 尽量减少重渲染次数
//=========================

define(function(require, exports, module){
	
	var Collection = Backbone.Collection.extend({
	});

	//存放Collection的Wrapper Model
	//
	//因为父元素的Collection不能用Collection作子元素，所以需要一个Model来
	//做包装放入父元素的Collection内
	//
	//只有collection一个值
	var WrapperModel = Backbone.Model.extend({
		defaults : {
			collection : new Collection
		}
	})

	var View = Backbone.View.extend({

		type : 'LAYER',

		tagName : 'div',

		className : 'lblend-layer',

		collection : null,

		template : '<h5 class="lblend-layer-label">{{name}}</h5>\
					<div class="lblend-list"></div>',

		//
		//用作子元素的所有一渲染的view的缓存
		//
		_views : [],

		initialize : function(){
			if( ! this.collection){
				this.collection = new Collection;
			}
			
			this.collection.on('add', this._addModel, this);

			this.collection.on('remove', this._removeModel, this);

			this.render();

			//recursive
			//remove the deepest first
			this.on('dispose', function(){
				this.removeAll();
			}, this);
		},

		$list : null,
		$label : null,

		render : function(){
			var self = this;

			this.$el.html( _.template(this.template, {
				name : this.name
			} ) );

			self._views = [];
			// 缓存list的dom和label的dom
			self.$list = self.$el.children('.lblend-list');
			self.$label = self.$el.children('.lblend-layer-label');

			//递归渲染所有子元素
			self.collection.forEach(function(item, index){
				
				var view;

				if(item instanceof WrapperModel){	//子元素也是容器层（包括Vector类）
					var col = item.get('collection');
					view = new col.__viewconstructor__({
						collection : col
					})
				}else{
					view = new item.__viewconstructor__({
						model : item
					});
				}

				if(view){

					view.parent = self;

					view.render();
					self.$list.append(view.$el);
					self._views.push(view)
				}
			})
		},
		
		_addModel : function(model){
			//如果该组件只是被创建，还没有被渲染成dom元素
			//则直接渲染
			var view;
			if(model instanceof WrapperModel){	//是容器层
				var coll = model.get('collection');
				view = new coll.__viewconstructor__({
					collection : coll
				})
			}else{
				view = new model.__viewconstructor__({
					model : model
				});
			}
			
			view.parent = this;
			this.$list.append(view.$el);
			this._views.push(view);
		},

		_removeModel : function(model){

			_.each(this._views, function(view){
				if(view.model === model || view.collection === model.get('collection')){
					_.without(this._views, view);
					view.$el.remove();
				}
			})
		},

		appendView : function(view){

			if(view.parent){
				view.parent.removeView(view);
			}

			if(view.model){
				// 不触发collection的添加事件
				this.collection.push(view.model, {silent : true});
			}
			else if(view.collection){

				var model = new WrapperModel({
					collection : view.collection
				});
				this.collection.push(model, {silent : true});
			}

			if(view){
				view.parent = this;
				this.$list.append(view.$el);
				this._views.push(view);
			}
		},

		removeView : function(view){
			
			view.trigger('dispose');

			var index = _.indexOf(this._views, view);
			if(index < 0){
				return null;
			}
			_.without(this._views, view);
			view.$el.remove();

			this.collection.remove(this.collection.at(index), {
				silent : true
			});

			// 
			view.trigger('disposed');
		},

		removeAll : function(){
			_.each(this._views, function(view){
				view.trigger('dispose')
				view.$el.remove();	
				view.trigger('disposed');
			})
			this._views = [];
			this.collection.reset();
		},

		findByType : function(type){
			
			var self = this;

			var result = [];

			function find(view){
				if(view._views){

					_.each(view._views, function(_view, index){
						//递归查找
						find(_view);
					})
				}

				if(type.toUpperCase() == view.type){
					result.push(view);
				}
			}
			find(this);

			return result;
		},

		findByName : function(name, recursive){

			var self = this;

			var result = null;

			recursive = _.isUndefined(recursive) ? true : recursive;

			function find(view){
				if(view.name == name){
					result = name;
				}

				if(view._views && recursive){
					_.each(view._views, function(_view, index){
						find(_view);
					})
				}
			}
			find(this);

			return result;
		},
		//path is splited by /
		find : function(path){
			return _.reduce(_.compact(path.split('/')), function(view, name){
				if( ! view){
					return;
				}
				return view.findByName(name, false);
			}, this);
		},

		setName : function(name){
			this.name = name;
			this.$el.children('h5').html(name);
		},

		hideLabel : function(){
			this.$el.children('h5').css({display:'none'});
		},

		showLabel : function(){
			this.$el.children('h5').css({display:'auto'})
		}

	})

	exports.Collection = Collection;

	exports.WrapperModel = WrapperModel;
	
	exports.View = View;

	Collection.prototype.__viewconstructor__ = View;
})
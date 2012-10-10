//=======================================
//Link.js
//节点连接线组件
//依赖Raphael来绘制连接线
//
//将source和target改成位置来降低耦合度
//=======================================

define(function(require, exports, module){

	var Model = Backbone.Model.extend({
		defaults:{
			source : {left:0, top:0},
			target : {left:0, top:0}
		}
	})

	var View = Backbone.View.extend({

		type : 'LINK',

		model : null,

		initialize : function(){

			if( ! this.model){
				this.model = new Model;
			}

			this.model.on('change:source', function(){

				this._updatePath();
			}, this);

			this.model.on('change:target', function(){

				this._updatePath();
			}, this);

		},

		render : function(svg){
			var p1 = this.model.get('source') || {left : 0, top:0},
				p2 = this.model.get('target') || p1;

			this.el = svg.create('path');
			svg.attr(this.el, 'd', this._getPathString(p1, p2));
			// 默认颜色
			svg.attr(this.el, {
				'stroke' : '#c8c828',
				'stroke-width' : 2,
				'fill' : 'none'
			});
			// cache svg context
			this._svg = svg;

		},

		_updatePath : function(){
			if( ! this._svg){
				return;
			}
			var p1 = this.model.get('source') || {left : 0, top:0},
				p2 = this.model.get('target') || p1;

			this._svg.attr(this.el, 'd', this._getPathString(p1, p2));
		},

		_getPathString : function(p1, p2){

			var c1 = {left : p1.left+60, top : p1.top},
				c2 = {left : p2.left-60, top : p2.top};

			return _.template("M {{p1x}} {{p1y}} C {{c1x}} {{c1y}} {{c2x}} {{c2y}} {{p2x}} {{p2y}}",
						{
							p1x : p1.left,
							p1y : p1.top,
							c1x	: c1.left,
							c1y : c1.top,
							c2x : c2.left,
							c2y : c2.top,
							p2x : p2.left,
							p2y : p2.top				
						});
		},

		remove : function(){
			this.el.parentNode.removeChild(this.el);
		}
	})

	exports.View = View;

	exports.Model = Model;

	Model.prototype.__viewconstructor__ = View;
})
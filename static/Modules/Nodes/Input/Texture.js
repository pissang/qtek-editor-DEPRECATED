//=====================
// Texture节点
// 数值
//=====================
define(['../Base', '../../../UIBase/Texture'], function(require, exports, module){

	var Base = require('../Base');
	var Texture = require('../../../UIBase/Texture');

	// inherit from base node
	var Node = function(name){

		Base.Node.call(this, name);

		this.time = 0;

		this._timeInstance = null;
	};

	Base.Node.inherit(Node, {
		// @override
		init : function(){
			var self = this;
			// 调用父节点的init函数
			Base.Node.prototype.init.call(this);

			var view = new Texture.View;
			view.model.set({
				name : 'output'
			});

			this.parameterLayerView.appendView(view);
			this.outputPins.add({
				'name' : 'output'
			})

		}
	});

	exports.Node = Node;
})
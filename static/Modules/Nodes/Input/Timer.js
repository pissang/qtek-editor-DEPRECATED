//=====================
// Timer节点
// 计时器
//=====================
define(['../Base', '../../../UIBase/Float'], function(require, exports, module){

	var Base = require('../Base');
	var Float = require('../../../UIBase/Float');

	// inherit from base node
	var Node = function(name){

		Base.Node.call(this, name);

		this.time = 0,

		this._timeInstance = null;
	};

	Base.Node.inherit(Node, {
		// @override
		init : function(){
			var self = this;
			// 调用父节点的init函数
			Base.Node.prototype.init.call(this);

			var timeView = new Float.View;
			timeView.model.set({
				name : 'output'
			});

			this.timeView = timeView;

			this.parameterLayerView.appendView(timeView);
			this.outputPins.add({
				'name' : 'output'
			})

			this.start();
		},

		reset : function(){

			this.time = 0;
		},

		start : function(){

			var self = this;
			this._timeInstance = setInterval(function(){
				
				self.timeView.model.set('value', self.time);
				
				self.time += 0.01;
			}, 10);
		},

		pause : function(){

			clearInterval(this._timeInstance);

		},

		stop : function(){

			this.pause();
			this.reset();
		},
		// @override
		dispose : function(){

			clearInterval(this._timeInstance);
		}
	});

	exports.Node = Node;
})
//==============================================
//Base.js
// 封装了节点和连线的展示和交互
// 所有节点都应该从Base.Node继承
// 继承需要自己定义的属性：
//	inputPins
//	outputPins
//	inputs
// 	outputs
// 
// 设置inputPins和outputPins后需要从parametersLayerView中获取对应name的view组件
//
// 静态方法inherit实现继承
//==============================================
define(['../UI/index',
		'../UI/Mixin/index',
		'../svg',
		'../Layers/Hub',
		'../Layers/Compositor'], function(require, exports, module){

	var UI = require('../UI/index');
	var Mixin = require('../UI/Mixin/index');
	var svg = require('../svg');
	var hub = require('../Layers/Hub').getInstance();
	
	var compositor;

	var _linkHandling,
		_nodes = [];

	var Node = function(name){

		compositor = require('../Layers/Compositor').getInstance();

		var self = this;

		this.name = name;

		//输入输出的连接线
		this.inputLinks = new Backbone.Collection;
		this.outputLinks = new Backbone.Collection;

		//输入输出端口的名字和类型
		//Backbone.Model{name, type}
		this.inputPins = new Backbone.Collection;
		this.outputPins = new Backbone.Collection;

		// 作为input pin的views
		this.inputPinViews = {};
		this.outputPinViews = {};

		// 预留的输入输出函数
		this.outputs = {};
		this.inputs = {};

		this.inputPins.on('add', this._addInputPin, this);
		this.outputPins.on('add', this._addOutputPin, this);
		this.inputPins.on('remove', this._removeInputPin, this);
		this.outputPins.on('remove', this._removeOutputPin, this);

		this.init();

		// 需要自己定义这个exec函数，生成数据
		// this.exec = null;

		// dispose
		// this.dispose = function(){};
		//
		_nodes.push(this);
	}

	_.extend(exports, Backbone.Events);

	// 继承，静态方法
	// sub 子类
	// props 扩展的方法
	Node.inherit = function(sub, props){
		_.extend(sub.prototype, _.pick(Node.prototype, 'init',
														'_addInputPin',
														'_addOutputPin',
														'_removeInputPin',
														'_removeOutputPin',
														'attachInputLink',
														'detachInputLink',
														'attachOutputLink',
														'detachOutputLink',
														'output',
														'input',
														'traverse'));

		props = props || {};
		_.extend(sub.prototype, props);
	}

	Node.prototype.init = function(){
		var self = this;
		// 输入接口层
		var inputLayerView = new UI.Layer.View;
		// 输出接口层
		var outputLayerView = new UI.Layer.View;
		// 参数层
		var parameterLayerView = new UI.Layer.View;

		var nodeView = new UI.Node.View();
		nodeView.setName(this.name);
		nodeView.appendView(inputLayerView);
		nodeView.appendView(parameterLayerView);
		nodeView.appendView(outputLayerView);

		this.view = nodeView;
		this.inputLayerView = inputLayerView;
		this.outputLayerView = outputLayerView;
		this.parameterLayerView = parameterLayerView;

		//节点删除
		this.view.on('close', function(){
			//  删除节点，并且移除相关的连接线
			self.outputLinks.forEach(function(link){
				findNode(link.get('tNode')).detachInputLink(link);
				link.get('view').remove();
			})
			self.inputLinks.forEach(function(link){
				findNode(link.get('sNode')).detachOutputLink(link);
				link.get('view').remove();
			})

			self.view.remove();

			_.without(_nodes, self);

			self.dispose && self.dispose();
		})

		// 节点拖动
		this.view.on('drag', function(){
			var offset = compositor.view.$el.offset();
			self.inputLinks.forEach(function(link){
				var pinName = link.get('tPin');
				// 更新连接线
				link.get('view').model.set('target', self.inputPinViews[pinName].getPosition(offset));
			})
			self.outputLinks.forEach(function(link){
				var pinName = link.get('sPin');
				// 更新连接线
				link.get('view').model.set('source', self.outputPinViews[pinName].getPosition(offset));
			})
		})
	}

	Node.prototype._addInputPin = function(inputPin){

		var pinName = inputPin.get('name'),
			pinType = inputPin.get('type'),
			self = this;

		// 从paramterLayerView中找出来插入到inputLayerView中
		var view = this.parameterLayerView.findByName(pinName);
		if( ! view){
			// this.inputPins.remove(inputPin);
			console.error('input pin "'+pinName+'" not existed');
			return;
		}
		Mixin.InputPin.applyTo(view);
		this.inputLayerView.appendView(view);

		this.inputPinViews[pinName] = view;

		// 连接线拖拽到输入口上
		view.$el.mouseover(function(){
				if(_linkHandling){
					// attach
					_linkHandling.attach(self, view);
				}
			})
			.mouseout(function(){
				if(_linkHandling){
					//detach
					_linkHandling.detach();
				}
			})
			.mouseup(function(){
				if(! _linkHandling){
					return;
				}

				// self is the target node
				self.attachInputLink(_linkHandling);
				// attach the sourceNode
				var sourceNode = findNode(_linkHandling.get('sNode'));
				sourceNode.attachOutputLink(_linkHandling);

			});

		//将输入口的连接线拖出去
		view.$pin.draggable({

			start : function(){
				var link = self.inputLinks.where({
					tPin : pinName
				})[0];
				if ( ! link){
					return false;
				}

				_linkHandling = link;

				var sourceNode = findNode(_linkHandling.get('sNode'));
				sourceNode.detachOutputLink(link);
				self.detachInputLink(link);
			},
			drag : function(event, ui){

				if( _linkHandling.get('tNode')){

					// _linkHandling.get('view').model.set('target', {left:event.clientX, top:event.clientY});
				}else{

					var offset = compositor.view.$el.offset();
					_linkHandling.get('view').model.set('target', {left:event.pageX-offset.left, top:event.pageY-offset.top});
				}
			},
			helper : function(){

				return document.createElement('div');
			},
			stop : function(){

				if( ! _linkHandling.get('tNode')){

					_linkHandling.get('view').remove();
				}

				_linkHandling = null;
			}
		});

		// 自动生成input函数
		// switch(view.type){
		// 	case 'FLOAT':
		// 		// sourceData是一个Number
		// 		self.inputs[pinName] = function(sourceData){

		// 			if(! _.isNumber(sourceData)){
		// 				// console.warn('')
		// 				return;
		// 			}
		// 			view.model.set('value', sourceData);
		// 		}
		// 		break;
		// 	case 'TEXTURE':
		// 	case 'VIDEO':
		// 		break;
		// }
	}

	Node.prototype._addOutputPin = function(outputPin){

		var pinName = outputPin.get('name'),
			pinType = outputPin.get('type'),
			self = this;

		// 从paramterLayerView中找出来插入到outputLayerView中
		var view = this.parameterLayerView.findByName(pinName);
		if( ! view){
			// this.outputPins.remove(outputPin);
			console.error('output pin "' + pinName + '" not existed');
			return;
		}
		Mixin.OutputPin.applyTo(view);
		this.outputLayerView.appendView(view);

		this.outputPinViews[pinName] = view;
		// 添加拖拽事件
		view.$pin.draggable({

			start : function(){
				var offset = compositor.view.$el.offset();
				// 创建一条正在拖动的连接线
				var linkView = new UI.Link.View({
					model : new UI.Link.Model({
						source : view.getPosition(offset)
					})
				});

				_linkHandling = new Link({
					view : linkView,
					sNode : self.name,
					tNode : '',
					sPin : pinName,
					tPin : ''
				});

				linkView.render(svg);

				hub.trigger('created:link', linkView);
			},
			drag : function(event, ui){

				if( _linkHandling.get('tNode')){

					// _linkHandling.get('view').model.set('target', {left:event.clientX, top:event.clientY});
				}else{

					var offset = compositor.view.$el.offset();
					_linkHandling.get('view').model.set('target', {left:event.pageX-offset.left, top:event.pageY-offset.top});
				}
			},
			helper : function(){

				return document.createElement('div');
			},
			stop : function(){
				// 如果未连接到任何输入上，就移除连接线
				if( ! _linkHandling.get('tNode')){

					_linkHandling.get('view').remove();
				}

				_linkHandling = null;

			}
		})
	}

	Node.prototype._removeInputPin = function(inputPin){

	}

	Node.prototype._removeOutputPin = function(outputPin){

	}

	Node.prototype.attachInputLink = function(link){
		// 移除原先端口上的连接线
		this.detachInputLink(link.get('tPin'), true);

		this.inputLinks.push(link);
	}

	Node.prototype.detachInputLink = function(link, removeView){
		if(_.isString(link)){

			link  = this.inputLinks.where({
				tPin : link,
			})[0];
		}
		if(link){
			if(removeView){
				link.get('view').remove();
			}
			this.inputLinks.remove(link);
		}
	}

	Node.prototype.attachOutputLink = function(link){

		this.detachOutputLink(link.get('sPin'), true);

		this.outputLinks.push(link);
	}

	Node.prototype.detachOutputLink = function(link, removeView){

		if(_.isString(link)){

			link  = this.inputLinks.where({
				tPin : link,
			})[0];
		}
		if(link){
			if(removeView){
				link.get('view').remove();
			}
			this.outputLinks.remove(link);
		}
	}

	Node.prototype.output = function(pinName){

		if(this.outputs[pinName]){

			return this.outputs[pinName].call(this);
		}
	}

	Node.prototype.input = function(pinName, sourceData){

		if(this.inputs[pinName]){

			this.inputs[pinName].call(this, sourceData);
		}
	}

	// 
	Node.prototype.traverse = function(){
		
		var self = this;

		this.inputLinks.forEach(function(link){

			var sNode = findNode(link.get('sNode'));

			// 不多次遍历执行
			if( ! sNode.__traversed__){
				
				sNode.traverse();
				// 已经被执行过一遍
				sNode.__traversed__ = true;
			}

			self.input( link.get('tPin'), sNode.output(link.get('sPin')) );
			
		})

		this.exec && this.exec();
	}

	var Link = Backbone.Model.extend({
		defaults : {
			sNode : '',
			tNode : '',
			sPin : '',
			tPin : '',
			view : null
		},
		// 将link attach到pin上（这时候pin并没有attach这个link，是单向的
		// 只有mouseup的时候pin才会attach这个link
		// tNode {Node}
		// tPin {InputPin}
		attach : function(tNode, tPin){
			var offset = compositor.view.$el.offset();
			if(this.get('view')){
				this.get('view').model.set('target', tPin.getPosition(offset));
			}
			this.set('tNode', tNode.name);
			this.set('tPin', tPin.model.get('name'));
		},

		detach : function(){
			this.set('tNode', '');
			this.set('tPin', '');
		}
	});
	
	var findNode = function(name){

		for(var i = 0, len = _nodes.length; i <len; i++){
			if(_nodes[i].name === name){
				return _nodes[i];
			}
		}
	}

	exports.Node = Node;

	exports.Link = Link;

	exports.findNode = findNode;

	exports.exec = function(){

		var outputNodes = [];
		_.each(_nodes, function(node){
			node.__traversed__ = false;
			if(node.__output__){
				outputNodes.push(node);
			}
		})
		_.each(outputNodes, function(outputNode){
			outputNode.traverse();
		})
	}
	
})
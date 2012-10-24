//===================
// Console.js
// 控制台
//===================
define(['../UIBase/index', 
		'../UIBase/Mixin/index', 
		'./Hub'], function(require, exports, module){

	var UIBase = require('../UIBase/index');
	UIBase.Mixin = require('../UIBase/Mixin/index');
	var hub = require('./Hub').getInstance();

	var view;;

	function getInstance(){
		if(view){
			return {
				view : view
			}
		}

		view = new UIBase.Panel.View;
		view.setName('Console');
		view.$el.attr('id', 'Console');

		UIBase.Mixin.Scrollable.applyTo( view );
		
		handleHubEvent();

		return {
			view : view
		}
	}

	function handleHubEvent(){
		hub.on('all', function(){
			var args = Array.prototype.slice.call(arguments, 0);
			view.$list.append(args.shift()+'....'+args.join(' ') +'<br />');
		})
	}

	return {
		getInstance : getInstance
	}
})
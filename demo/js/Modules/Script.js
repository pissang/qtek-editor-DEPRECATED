//========================
//Script.js
//脚本编辑器
//========================
define(function(require, exports, module){
	
	var Panel = require('../Core/UIBase/Panel');

	function create(){

		var view = new Panel.View;
		view.$list.css('position', 'relative');
		view.$el.addClass('scripteditor');
		
		return {
			view : view
		}
	}

	return {
		create : create
	}
})
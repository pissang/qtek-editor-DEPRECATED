//====================
// Hub.js
// 整个程序的消息收发中介
// Signal.js?
//====================
define(function(require, exports, module){

	var hub = null;
	
	function getInstance(){
		
		if( ! hub){

			hub = {};
			_.extend(hub, Backbone.Events);
		}

		return hub;
	}

	return {
		getInstance : getInstance
	}
})
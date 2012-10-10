//==========================
//svg 操作的简单类
//===========================
define(function(require, exports, module){

	var xmlns = 'http://www.w3.org/2000/svg';

	exports.create = function(tag){

		return document.createElementNS(xmlns, tag);
	};

	exports.attr = function(elem, attr, value){
		var attrs = attr;
		if(_.isString(attr)){
			attrs = {};
			attrs[attr] = value;
		}
		_.each(attrs, function(value, attr){

			elem.setAttributeNS(null, attr, value);
		})
	}
})
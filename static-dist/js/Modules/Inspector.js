//==========================
// Inspector.js
// 属性查看及编辑
//==========================
define(function(require, exports, module){

	var UIBase = require('../Core/UIBase/index');
	UIBase.Mixin = require('../Core/UIBase/Mixin/index');
	var hub = require('../Core/Hub').getInstance();
	var project = require('./Project').getInstance();

	var view;

	var selectedNode;

	function getInstance(){
		if(view){
			return {
				view : view
			}
		}

		view = new UIBase.Panel.View;
		view.setName('Inspector');
		view.$el.attr('id', 'Inspector');

		UIBase.Mixin.Scrollable.applyTo( view );

		handleHubEvent();

		return {
			view : view
		}
	}

	function handleHubEvent(){

		hub.on('inspect:object', function(configs){

			view.removeAll();
			_.each(configs, function(item, name){
				
				view.appendView( createView(name, item) );
			})
		})
	}

	function createView(name, item){
		var itemView;
		switch(item.type.toLowerCase()){
			case 'layer':
				itemView = new UIBase.Layer.View;
				itemView.setName(name);
				itemView.$el.addClass('inspector-'+item['class']);

				_.each(item.sub, function(subItem, name){
					itemView.appendView( createView(name, subItem) );
				})
				break;
			case 'input':
				itemView = createInputView(name, item.value, item.onchange);
				break;
			case 'image':
				itemView = createImageView(name, item.value, item.onchange);
				break;
			case 'select':
				itemView = createSelectView(name, item.value, item.options, item.onchange);
				break;
			case 'boolean':
				itemView = createBooleanView(name, item.value, item.onchange);
				break;
			case 'vector':
				itemView = createVectorView(name, item.value, item.min, item.max, item.step, item.onchange);
				break;
		}
		return itemView;
	}

	function createInputView(name, value, onchange){
		var view = new UIBase.Input.View;

		view.model.set({
			name : name,
			value : value
		})

		view.model.on('change:value', function(model, value){
			onchange && onchange(value);
		})

		return view;
	}

	function createImageView(name, image, onchange ){

		var view = new UIBase.Image.View;
		view.model.set({
			name : name,
			src : image.src
		});
		image.onload = function(){
			onchange && onchange(image);		
		}	
		view.model.on('change:src', function(model, value){

			image.src = value;
		});

		return view;
	}

	function createTextureView(name, value, onchange ){

		var view = new UIBase.Texture.View;
		

		return view;
	}

	function createBooleanView(name, value, onchange ){

		var view = new UIBase.Checkbox.View;
		view.model.set({
			'name' : name,
			'value' : value
		})
		view.model.on('change:value', function(model, value){
			onchange && onchange(value);
		})

		return view;
	}

	function createSelectView(name, value, options, onchange){
		var view = new UIBase.Select.View;
		view.setName(name);
		_.each(options, function(item){
			view.collection.add({
				name : item['value'],
				value : item['value'],
				html : item['description']
			});
		})
		view.select(value);

		view.on('change', function(item){
			onchange && onchange(item.get('value'));
		})

		return view;
	}

	function createFloatView(name, value, min, max, step, onchange){

		var view = new UIBase.Float.View;
		view.model.set({
			'name' : key,
			'value': value,
			'min' : min,
			'max' : max,
			'step' : step
		});
		view.model.on('change:value', function(model, value){
			
			onchange && onchange(value);
		})

		return view;
	}

	function createVectorView(name, value, min, max, step, onchange){

		var view = new UIBase.Vector.View;
		view.setName(name);

		_.each(value, function(val, key){
			view.collection.add({
				name : key,
				value : val,
				min : min,
				max : max,
				step : step
			})
		})
		view.collection.on('change:value', function(model){
			onchange && onchange(model.get('name'), model.get('value'));
		})

		return view;
	}

	function createColorView(name, value, onchange){
		
	}

	return {

		getInstance : getInstance
	}
})
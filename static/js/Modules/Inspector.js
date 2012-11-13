//==========================
// Inspector.js
// 属性查看及编辑
//==========================
define(function(require, exports, module){

	var UIBase = require('../Core/UIBase/index');
	UIBase.Mixin = require('../Core/UIBase/Mixin/index');
	var hub = require('../Core/Hub').getInstance();
	var FS = require('../Core/Assets/FileSystem');

	var view;

	var configs;

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

		hub.on('inspect:object', function(_configs){

			view.removeAll();

			configs = _configs;
			
			_.each(configs, function(item, name){
				
				var itemView = createView(name, item);

				if( itemView ){

					view.appendView( itemView );
				}
			})
		})
	}

	function createView(name, item){
		var itemView;
		switch(item.type.toLowerCase()){
			case 'layer':
				itemView = new UIBase.Layer.View({
					name : name
				});

				if( item['class'] ){
					itemView.$el.addClass('inspector-'+item['class']);
				}

				_.each(item.sub, function(subItem, name){
					var _view = createView(name, subItem)
					if(_view){
						itemView.appendView( _view );
					}
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
			case 'float':
				itemView = createFloatView(name, item.value, item.min, item.max, item.step, item.onchange);
				break;
			case 'boolean':
				itemView = createBooleanView(name, item.value, item.onchange);
				break;
			case 'vector':
				itemView = createVectorView(name, item.value, item.min, item.max, item.step, item.onchange);
				break;
			case 'color':
				itemView = createColorView(name, item.value, item.onchange);
				break;
			case 'texture':
				itemView = createTextureView(name, item.value, item.onchange);
				break;
		}
		if(itemView && item.acceptConfig){
			
			UIBase.Mixin.Acceptable.applyTo(itemView);
			_.extend(itemView.acceptConfig, item.acceptConfig);
		}
		return itemView;
	}

	function createInputView(name, value, onchange){
		var view = new UIBase.Input.View({
			name : name
		});

		view.model.set({
			value : value
		})

		view.model.on('change:value', function(model, value){
			onchange && onchange(value);
		})

		return view;
	}

	function createImageView(name, image, onchange ){

		var view = new UIBase.Image.View({
			name : name
		});
		view.model.set({
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

		var view = new UIBase.Texture.View({
			name : name
		});

		// value is '' when the texture is null
		if( value ){	
			var texAsset = FS.root.find(value).data;
			if( ! texAsset){
				console.warn('texture '+value+' is not in the project');
				return;
			}
			view.model.set({
				path : value,
				texture : texAsset.data
			})
		}else{
			view.model.set({
				name : name,
				path : ''
			})
		}

		view.model.on('change:path', function(model, _value){
			onchange && onchange(_value);
		})

		// accept texture
		view.$el[0].addEventListener('drop', function(e){
			var json = e.dataTransfer.getData('text/plain');
			if( json ){
				json = JSON.parse(json);
			}
			// from three view
			if( json.owner ){	
				if( json.owner == 'project' && json.dataType == 'texture'){
					
					view.model.set('path', json.dataSource);
				}
			}
		})

		return view;
	}

	function createBooleanView(name, value, onchange ){

		var view = new UIBase.Checkbox.View({
			name : name
		});
		view.model.set({
			'value' : value
		})
		view.model.on('change:value', function(model, value){
			onchange && onchange(value);
		})

		return view;
	}

	function createSelectView(name, value, options, onchange){
		var view = new UIBase.Select.View({
			name : name
		});
		view.setName(name);
		_.each(options, function(item){
			view.collection.add({
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

		var view = new UIBase.Float.View({
			name : name
		});
		view.model.set({
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

		// add float clear
		view.$el.append('<div style="clear:both"></div>')

		return view;
	}

	function createColorView(name, value, onchange){
		
		var view = new UIBase.Color.View({
			name : name
		});

		// adapt to native color picker format
		if( value[0] != '#'){
			value = '#' + value.toString(16);
		}

		view.model.set({
			color : value
		});
		view.model.on('change:color', function(model, val){

			// adapt to native color picker format
			val = parseInt(val.substr(1), 16);
			onchange && onchange(val);
		})

		return view;
	}

	return {

		getInstance : getInstance
	}
})
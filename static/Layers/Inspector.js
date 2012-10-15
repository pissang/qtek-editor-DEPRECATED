//==========================
// Inspector.js
// 属性查看及编辑
//==========================
define(['../UI/index', '../UI/Mixin/index', './Hub', './Project'], function(require, exports, module){

	var UI = require('../UI/index');
	UI.Mixin = require('../UI/Mixin/index');
	var hub = require('./Hub').getInstance();
	var project = require('./Project').getInstance();

	var view;

	var selectedNode;

	function getInstance(){
		if(view){
			return {
				view : view
			}
		}

		view = new UI.Panel.View;
		view.setName('Inspector');
		view.$el.attr('id', 'Inspector');

		UI.Mixin.Scrollable.applyTo( view );

		handleHubEvent();

		return {
			view : view
		}
	}

	function handleHubEvent(){

		hub.on('selected:node', function(node){

			showProperties(node);

			selectedNode = node;
		});

		hub.on('updated:object', function(node, query, value){

			if( node == selectedNode ){

				if( query == 'material'){

					updateMaterialDetail( value, view.findByName('Material') );
				}
			}
		})
	}

	function showProperties(node){
		
		view.removeAll();

		if( ! node){
			return ;
		}
		// name layer;
		view.appendView( createNameLayer(node) );
		// transform layer;
		view.appendView( createTransformLayer(node) );

		// 
		if( node instanceof THREE.Light){

			view.appendView( createLightLayer(node) );
		}

		else if(node instanceof THREE.Mesh){

			view.appendView( createMaterialLayer(node) );
		}

		if( node instanceof THREE.Camera){

			view.appendView( createCameraLayer(node) );
		}
		
	}

	function createNameLayer(node){

		var nameLayerView = new UI.Layer.View;
		nameLayerView.$el.addClass('inspector-name');
		nameLayerView.setName('name');
		nameLayerView.hideLabel();

		var inputView = new UI.Input.View;
		inputView.model.set('value', node.name);
		inputView.on('change:value', function(model, value){
			// node.name = value	写成事件，Hierarchy里也能更新
		})
		nameLayerView.appendView(inputView);

		return nameLayerView;
	}

	function createTransformLayer(node){

		var container = new UI.Layer.View;
		container.setName('Transform');
		container.$el.addClass('inspector-transform');

		// position
		var view = createVector3View(node, 'position', -1000000, 1000000, 0.5);
		container.appendView( view );

		// rotation
		view = createVector3View(node, 'rotation', -1000000, 1000000, 0.1);
		container.appendView( view );

		// scale
		view = createVector3View(node, 'scale', -1000000, 1000000, 0.1);
		container.appendView( view );

		//apply collapasable
		UI.Mixin.Collapsable.applyTo(container);
		return container;
	}

	function createCameraLayer(camera){

		var container = new UI.Layer.View;
		container.setName('Camera');
		container.$el.addClass('inspector-camera');

		if( camera instanceof THREE.PerspectiveCamera ){

			append( createFloatView( camera, 'fov', 0, 90, 0.1, onchange));
			append( createFloatView( camera, 'near', 0, 10, 0.05, onchange ));
			append( createFloatView( camera, 'far', 0, 10000, 1, onchange ));

		}
		else{
			append( createFloatView( camera, 'left', -1000, 0, 1, onchange));
			append( createFloatView( camera, 'right', 0, 1000, 1, onchange ));
			append( createFloatView( camera, 'top', 0, 1000, 1, onchange ));
			append( createFloatView( camera, 'bottom', -1000, 0, 1, onchange ));
			append( createFloatView( camera, 'near', -1000, 0, 1, onchange ));
			append( createFloatView( camera, 'far', 0, 1000, 1, onchange ));
		
		}

		var viewCamera = new UI.Button.View;
		viewCamera.model.set({
			name : 'viewCamera',
			label : 'viewCamera'
		})

		append( viewCamera );
		viewCamera.on('click', function(){
			hub.trigger('view:camera', camera);
		})
		
		// decorate for container.appendView
		function append(view){
			container.appendView( view );
		}
		function onchange(){
			camera.updateProjectionMatrix();
		}

		return container;
	}

	function createMaterialLayer(mesh){

		var container = new UI.Layer.View;
		container.setName('Material');
		container.$el.addClass('inspector-material');

		updateMaterialDetail(mesh.material, container);

		// 拖拽添加材质
		container.el.addEventListener('drop', function(e){

			e.stopPropagation();
			var json = e.dataTransfer.getData('text/plain');
			
			if( json ){

				var data = project.receiveDataTransfer( json, 'material');
				if( data ){

					hub.trigger('update:object', mesh, 'material', data);
				}
			}
		})
			
		UI.Mixin.Collapsable.applyTo(container);

		return container;
	}

	function updateMaterialDetail(material, container){
			
		container.removeAll();
		
		var materialName = new UI.Label.View;
		materialName.$el.addClass('inspector-material-name');
		container.appendView(materialName);

		if( material.__system__ ){
			materialName.model.set('value', 'none')
			return ;
		}
		materialName.model.set('value', material.name);

		var materialSelect = new UI.Select.View;
		materialSelect.collection.add([
			{name:'basic', value:'Basic Material'},
			{name:'lambert', value:'Lambert Material'},
			{name:'phong', value:'Phong Material'},
			{name:'custom', value:'Custom Material'}
		]);
		materialSelect.setName('type');
		container.appendView(materialSelect);

		_.each(materialMap, function(Material, name){
			if( material instanceof Material ){
				materialSelect.select(name);
			}
		})

		materialSelect.on('change', function(model){
			// how to change an object's instanceof
			// var Material = materialMap[model.get('name')];
			// // modify the constructor
			// material.constructor = Material;
			// var newMat = new Material();
			// var props = {};
			// newMat.clone( props );
			// // extend the props to the material(no overwrite)
			// _.defaults(material, props);

			// hub.trigger('updated:object', material, '', null);
		})

		// common material options
		append( createBooleanView( material, 'depthTest') );
		// todo add the disable of the ui compoment
		append( createBooleanView( material, 'transparent') );
		// wireframe still useless
		append( createBooleanView( material, 'wireframe' ) );
		append( createFloatView(material, 'opacity', 0, 1.0, 0.001) );

		append( createBooleanView( material, 'visible') );
		
		if( ! ( material instanceof THREE.ShaderMaterial ) ){

			append( createColorView( material, 'color' ) );
			append( createColorView( material, 'ambient' ) );
			append( createColorView( material, 'emissive' ) );

			if( material instanceof THREE.MeshPhongMaterial ){
			
				append( createColorView( material, 'specular' ) );
				append( createFloatView( material, 'shininess', 0, 100, 0.1 ) );
				append( createBooleanView( material, 'metal') );
				append( createBooleanView( material, 'perPixel') );

			}

			// todo add other map and texture repeat
			append( createTextureView( material, 'map') );
			append( createTextureView( material, 'lightMap') );

			if( material instanceof THREE.MeshPhongMaterial ){
				append( createTextureView( material, 'normalMap') );
			}
			else{
				append( createTextureView( material, 'specularMap') );
			}
		}
		else{


		}

		// decorate for container.appendView
		function append(view){
			container.appendView( view );
		}
	}

	var materialMap = {
		'basic' : THREE.MeshBasicMaterial,
		'lambert' : THREE.MeshLambertMaterial,
		'phong' : THREE.MeshPhongMaterial,
		'custom' : THREE.ShaderMaterial
	}

	function createRenderLayer(mesh){

	}

	function createLightLayer(light){
		
		var container = new UI.Layer.View;
		container.setName('Light');
		container.$el.addClass('inspector-light');

		container.appendView( createColorView(light, 'color') );
		
		if(light instanceof THREE.AmbientLight){

		}
		else if(light instanceof THREE.PointLight){
			var intensityView = createFloatView(light, 'intensity', 0, 10, 0.01);
			container.appendView(intensityView);
			
			var distanceView = createFloatView(light, 'distance', 0, 1000, 0.1);
			container.appendView(distanceView);
		}
		else if(light instanceof THREE.SpotLight){

		}
		else if(light instanceof THREE.DirectionalLight){
			
		}
		//apply collapasable
		UI.Mixin.Collapsable.applyTo(container);
		return container;
	}

	function createTextureView( obj, key ){

		var view = new UI.Texture.View;
		view.model.set( 'name', key )
		
		if( obj[key] ){
			if( ! ( obj[key] instanceof THREE.DataTexture ) ){
				view.model.set( 'texture', obj[key] );
				// todo 不能这样写死
				view.model.set( 'filename', '/project/texture/'+obj[key].name);
			}
		}

		// 拖拽添加纹理
		view.popup.addEventListener('drop', function(e){

			e.stopPropagation();
			var json = e.dataTransfer.getData('text/plain');
			
			if( json ){

				var data = project.receiveDataTransfer( json, 'texture' );
				if( data ){
					// update the texture
					data.needsUpdate = true;
					hub.trigger('update:object', obj, key, data);

					json = JSON.parse(json);
					view.model.set('texture', data);
					view.model.set('filename', json.uri);
				}

			}
		})
	
		return view;
	}

	function createBooleanView( obj, key ){

		var view = new UI.Checkbox.View;
		view.model.set({
			'name' : key,
			'value' : obj[key]
		})
		view.model.on('change:value', function(model, value){
			hub.trigger('update:object', obj, key, value);

		})

		return view;
	}

	function createFloatView(obj, key, min, max, step, onchange){

		var view = new UI.Float.View;
		view.model.set({
			'name' : key,
			'value': obj[key],
			'min' : min,
			'max' : max,
			'step' : step
		});
		view.model.on('change:value', function(model, value){
			
			hub.trigger('update:object', obj, key, value);

			onchange && onchange();
		})

		return view;
	}

	function createVector2View(obj, key, min, max, step, onchange){
		var v = obj[key];
		var view = new UI.Vector.View;
		view.collection.add([
			{value : v.x, name : 'x', min: min, max : max, step : step},
			{value : v.y, name : 'y', min: min, max : max, step : step}
		]);
		view.setName(key);
		bindVectorUpdateEvent(view.collection, obj, key);
		
		return view;
	}

	function createVector3View(obj, key, min, max, step, onchange){
		var v = obj[key];
		var view = new UI.Vector.View;
		view.collection.add([
			{value : v.x, name : 'x', min: min, max : max, step : step},
			{value : v.y, name : 'y', min: min, max : max, step : step},
			{value : v.z, name : 'z', min: min, max : max, step : step}
		]);
		view.setName(key);
		bindVectorUpdateEvent(view.collection, obj, key, onchange);

		return view;
	}

	function createVector4View(obj, key, min, max, step, onchange){
		var v = obj[key];
		var view = new UI.Vector.View;
		view.collection.add([
			{value : v.x, name : 'x', min: min, max : max, step : step},
			{value : v.y, name : 'y', min: min, max : max, step : step},
			{value : v.z, name : 'z', min: min, max : max, step : step},
			{value : v.z, name : 'w', min: min, max : max, step : step}
		]);
		var sets = {};

		view.setName(key);
		bindVectorUpdateEvent(view.collection, obj, key, onchange);

		return view;
	}

	function bindVectorUpdateEvent(collection, obj, key, onchange){
		collection.forEach(function(model){
			var name = model.get('name');	//保存name, 防止被修改成uv后不能正确访问vector
			model.on('change:value', function(model){
				hub.trigger('update:object', obj, key+'.'+name, model.get('value') );

				onchange && onchange( )
			})
		})
	}

	function createColorView(obj, key){
		var c = obj[key];
		var view = new UI.Color.View({
			model : new UI.Color.Model({
				name : key,
				color : c.getHex()
			})
		})
		view.model.on('change:color', function(model, value){
			var hex = parseInt(value, 16);
			var r = ( hex >> 16 & 255 ) / 255,
				g = ( hex >> 8 & 255 ) / 255,
				b = ( hex & 255 ) / 255;
			hub.trigger('update:object', obj, key+'.r', r);
			hub.trigger('update:object', obj, key+'.g', g);
			hub.trigger('update:object', obj, key+'.b', b);
		})
		return view;
	}

	return {

		getInstance : getInstance
	}
})
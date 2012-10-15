//================
// Scene.js
// 场景编辑器
//================

define(['./Project', './Hub', './MouseEventDispatcher', '../UI/Panel'], function(require, exports){

	var Panel = require('../UI/Panel');
	var MouseEventDispatcher = require('./MouseEventDispatcher');
	var hub = require('./Hub').getInstance();
	var project = require('./Project').getInstance();


	var renderer,
		scene,
		camera,
		view,
		controls,

		mouseEventDispatcher;

	// active camera
	var activeCamera = null,
		cameras = [],
		lights = [];

	// 选中的物体
	var selectedNode;

	// 辅助显示
	var groundHelper;

	// 单例
	function getInstance(width, height){

		if( ! renderer){

			// 取消autoClear
			// 主要为了实现多个pass之间的叠加效果
			renderer = new THREE.WebGLRenderer({
				// antialias : true
				// preserveDrawingBuffer : true
			});
			renderer.autoClear = false;

			camera = new THREE.PerspectiveCamera( 45, width/height, 0.1, 10000 );
			camera.__helper__ = true;

			//scene
			scene = new THREE.Scene();
			scene.name = 'scene';

			//mouse event dispatcher
			mouseEventDispatcher = MouseEventDispatcher.create( scene, camera, renderer, true );

			setInterval(function(){
				render();
			}, 20);

			init();

			view = new Panel.View;
			view.setName('Scene');
			view.$el.attr('id', 'SceneEditor');
			view.$list.append(renderer.domElement);

			view.$list.append( createToolBar() );

			resize();
		}

		return {
			'renderer' : renderer,
			'scene' : scene,
			'camera' : camera,
			'view' : view,
			'resize' : resize,
			'getActiveCamera' : function(){
				return activeCamera;
			}
		}
	}

	function resize(){
		var width = view.$el.width();
		var height = view.$el.height();
		// resize canvas context
		renderer.setSize(width, height);
		// update camera apsect 
		camera.aspect = width/height;
		camera.updateProjectionMatrix();

		mouseEventDispatcher.resize();
	}

	function init(){

		groundHelper = helpers.ground();
		// transform helper
		transformHelper.init();
		// 初始化鼠标控制
		initMouseControl();
		// 
		handleHubEvent();
		// 默认选中到scene上
		hub.trigger('select:object', scene);
	}

	function initMouseControl(){
		
		controls = new MouseControls(camera, renderer.domElement);

		camera.position.set(20, 5, 20);
		camera.lookAt(new THREE.Vector3(0,0,0));
		camera.updateMatrix();

		// 场景拖拽
		var offset = new THREE.Vector3();
		scene.on('dragstart', function(e){
			hub.trigger('select:node', e.target);
		})
		scene.on('drag', function(e){

		})
		scene.on('drop', function(e){

		})
	}

	function createToolBar(){


	}
	// 
	// 处理所有从hub分配的事件
	// 如果是主动触发事件则统一为动名词，例如select:object create:mesh
	// 如果是事件完成后的回调事件则用过去式，如selected:object created:mesh
	// 
	// 触发顺序
	// 	create:mesh(light,camera)->   创建mesh(light,camera)
	//	created:mesh(light,camera)->
	//	add:node->        添加mesh到scene中
	//	added:node->
	//	select:node-> (是否需要自动选择？)
	//	selected:node
	function handleHubEvent(){

		hub.on('add:node', function(node, parent){
			parent = getNode(parent);
			if( ! parent){
				scene.add(node);
			}else{
				parent.add(node);
			}
			project.traverseHierarchy(node, function(_node){
				if(_node instanceof THREE.Mesh){
					_node.enablepicking = true;

					mouseEventDispatcher.updateScene();
				}
				else if(_node instanceof THREE.Light){
					// light数量变了，因此需要重新build一遍所有material的program
					// (THREE.js中light是写死在shader里的)
					// https://github.com/mrdoob/three.js/issues/598
					// （是否需要改成deferred lighting？
					project.traverseHierarchy(scene, function(node){
						if( node.material ){
							node.material.needsUpdate = true;
						}
					})
					//创建辅助显示的helper
					if( _node instanceof THREE.PointLight ){
						var helper = helpers['pointLight'](_node);
					}
					else if(_node instanceof THREE.DirectionalLight){
						var helper = helpers['directionalLight'](_node);
					}
					else if(_node instanceof THREE.SpotLight){
						var helper = helpers['spotLight'](_node);
					}

					lights.push(_node);
				}
				else if(_node instanceof THREE.Camera){

					hub.trigger('active:camera', _node);
					var helper = helpers['camera'](_node);
					cameras.push(_node);
				}
			})

			hub.trigger('added:node', node);
			// 创建完后自动选择
			hub.trigger('select:node', node);
		})

		// 创建物体的事件
		// @argument type
		// @argument args
		// 完成后触发dd:node和created:mesh事件	
		hub.on('create:mesh', function(type, args){
			var mesh = objects['mesh'][type](args);

			hub.trigger('created:mesh', mesh);
			hub.trigger('add:node', mesh);
		})

		//创建灯光
		//完成后触发created:light事件
		hub.on('create:light', function(type, args){
			var light = objects['light'][type](args);

			hub.trigger('created:light', light, type);
			hub.trigger('add:node', light);
		})

		hub.on('create:camera', function(type, args){
			var camera = objects['camera'][type](args);

			hub.trigger('created:camera', camera, type);
			hub.trigger('add:node', camera);
		})
		//激活摄像机
		hub.on('active:camera', function(camera){

			camera = getNode( camera );
			if( ! camera){
				return;
			}

			activeCamera = camera;
			hub.trigger('actived:camera', camera);
		})

		// 选择物体的事件
		// 选择后触发 hub.on('selected:light', function(){}) 事件
		hub.on('select:node', function(node){
			node = getNode(node);

			if( ! node){
				return;
			}
			selectedNode = node;

			// update bounding box
			transformHelper.updateBoundingBox( node );
			
			hub.trigger('selected:node', node);
		})

		//使用选中摄像机查看视角
		hub.on('view:camera', function(_camera){

			_camera = getNode( _camera );
			if( ! _camera){
				return;
			}

			camera = _camera;
			controls = new THREE.TrackballControls(camera, renderer.domElement);
			camera.aspect = renderer.domElement.width/renderer.domElement.height;
			camera.updateProjectionMatrix();
		})

		// 移除物体
		// 完成后触发removed:node事件
		hub.on('remove:node', function(node){

			node = getNode(node);

			node.parent.remove(node);

			var materialNeedsUpdate = false;

			project.traverseHierarchy(node, function(node){
				// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Operators/instanceof?redirectlocale=en-US&redirectslug=Core_JavaScript_1.5_Reference%2FOperators%2FSpecial_Operators%2Finstanceof_Operator
				if(node instanceof THREE.Light){
					materialNeedsUpdate = true;
					_.wihout( lights, node );
				}
				else if(node instanceof THREE.Camera){
					_.without( cameras, node );
					if( node == activeCamera ){
						hub.trigger( 'active:camera', _.last(cameras) );
					}
				}
			})

			if( materialNeedsUpdate ){
				project.traverseHierarchy(scene, function(node){
					if( node.material ){
						node.material.needsUpdate = true;
					}
				})
			}
			mouseEventDispatcher.updateScene();

			hub.trigger('removed:node', node);
		})
		// 移除选中的物体
		hub.on('remove:selected', function(){
			hub.trigger('remove:node', selectedNode);
		})

		// 更新object的属性，object包括node, material，geometry等任意对象, 但是不能通过name索引
		// 如果需要通过name索引，单独调用update:node update:material等事件
		hub.on('update:object', function(object, queryStr, value, silent ){
			
			query = queryStr.split('.');
			var item = object;
			// query for the deepest key
			for(i = 0;  i < query.length-1; i++){
				item = item[ query[i] ];
			}
			// degree to radians
			if( queryStr.indexOf('rotation.') >= 0){
				value = value / 360 * Math.PI*2;
			}
			// extend all the props of value if value is an object
			// need an extend prop to make sure its not a camera, material object or something else
			if( _.isObject(value) && value.extend ){
				// save the prev value;
				var valuePrev = _.pick( item[ _.last(query)], _.keys(value) );
				_.extend( item[_.last(query)], value );
			}
			else{	
				var valuePrev = item[ _.last(query) ];
				item[ _.last(query) ] = value;
			}
			// update camera helper
			if( object instanceof THREE.Camera){
				helpers.camera( object );
			}
			
			if( ! silent ){

				hub.trigger('updated:object', object, queryStr, value, valuePrev);
			}
			
		})
		// function parseValue(value){
		// 	// degree to radians
		// 	if( value.lastIndexOf('deg') > 0){
		// 		return parseInt(value) / 360 * Math.PI*2;
		// 	}
		// 	return value;
		// }

		hub.on('update:node', function(node, query, value, silent){

			var node = getNode(node);
			hub.trigger('update:object', node, query, value, silent);
		})

		hub.on('update:material', function( mat, query, value, silent ){

			if( _.isString( mat ) ){

				mat = project.getAsset( '/project/material/'+mat );
			}

			// 添加找不到material后输出的错误信息
			if( mat ){
				hub.trigger('updated:object', object, queryStr, value, valuePrev);
			}
		} )

		hub.on( 'update:selected', function(query, value, silent){

			hub.trigger('update:object', selectedNode, query, value, silent);
			
		} )
	}

	function getNode(node){
		if(_.isString(node)){
			if(node == scene.name){
				node = scene;
			}else{
				node = scene.getChildByName(node, true);
			}
		}
		return node;
	}

	function render(){
		// clear
		renderer.clear(true, true, true);
		// main scene pass
		renderer.render(scene, camera);
		// 清除深度缓存，color buffer就会直接覆盖上去
		renderer.clear(false, true, false);
		// tranform helper scene rendering pass
		// including move rotate scale
		transformHelper.render();
	}

	//
	// helper的创建函数(辅助显示那些看不到的物体，比如摄像机，灯光)
	//
	var helpers = {
		'ground' : function(){
			//100m x 100m, 5m x 5m per grid
			var groundGeo = new THREE.PlaneGeometry( 100, 100, 20, 20 );
			groundGeo.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / 2 ) );
			
			groundMesh = new THREE.Mesh(groundGeo, new THREE.MeshBasicMaterial( {
				wireframe : true,
				color : 0xaaaaaa
			} ) );
			groundMesh.__helper__ = 'ground';
			
			scene.add(groundMesh);

			return groundMesh;
		},
		// 摄像机的显示
		'camera' : function(camera){

			helpers.removeHelper(camera, 'camera');
			// 使用THREE.js自带的Helper
			var cameraHelper = new THREE.CameraHelper(camera);
			cameraHelper.__helper__ = 'camera';	//加个标记，遍历的时候应该被排除

			camera.add(cameraHelper);
		},
		// 点光源
		'pointLight' : function(light){
			helpers.removeHelper(light, 'pointLight');
			var helper = helpers.light();
			helper.__helper__ = 'pointLight';
			light.add(helper);
			return helper;
		},
		// 聚光灯
		'spotLight' : function(light){
			helpers.removeHelper(light, 'spotLight');
			var helper = helpers.light();
			helper.__helper__ = 'spotLight';
			light.add(helper);
			return helper;
		},
		// 平行光
		'directionalLight' : function(light){
			helpers.removeHelper(light, 'spotLight');
			var helper = helpers.light();
			helper.__helper__ = 'spotLight';
			light.add(helper);
			return helper;
		},
		'light' : function(){
			var geo = new THREE.Geometry();
			geo.vertices.push(new THREE.Vector3( 0, 0, 0 ));
			var material = new THREE.ShaderMaterial( {
				uniforms : THREE.UniformsUtils.clone(shaders.lightHelper.uniforms),
				vertexShader : shaders.lightHelper.vertexShader,
				fragmentShader : shaders.lightHelper.fragmentShader,
				transparent : true
			} );
			material.uniforms.texture.value = THREE.ImageUtils.loadTexture('assets/images/light.png');
			var helper = new THREE.ParticleSystem( geo, material);
			return helper;
		},
		'position' : function(){
			var positionHelper = new AxisHelper();
			positionHelper.__helper__ = 'axis';
			positionHelper.name = 'axishelper';

			return positionHelper;
		},
		'rotation' : function(){

		},
		'boundingBox' : function(node){
			var bb = project.computeBoundingBox( node );
			var geo = new THREE.CubeGeometry( 1, 1, 1);

			// copy from mr.doob editor
			geo.vertices[ 0 ].x = bb.max.x;
			geo.vertices[ 0 ].y = bb.max.y;
			geo.vertices[ 0 ].z = bb.max.z;

			geo.vertices[ 1 ].x = bb.max.x;
			geo.vertices[ 1 ].y = bb.max.y;
			geo.vertices[ 1 ].z = bb.min.z;

			geo.vertices[ 2 ].x = bb.max.x;
			geo.vertices[ 2 ].y = bb.min.y;
			geo.vertices[ 2 ].z = bb.max.z;

			geo.vertices[ 3 ].x = bb.max.x;
			geo.vertices[ 3 ].y = bb.min.y;
			geo.vertices[ 3 ].z = bb.min.z;

			geo.vertices[ 4 ].x = bb.min.x;
			geo.vertices[ 4 ].y = bb.max.y;
			geo.vertices[ 4 ].z = bb.min.z;

			geo.vertices[ 5 ].x = bb.min.x;
			geo.vertices[ 5 ].y = bb.max.y;
			geo.vertices[ 5 ].z = bb.max.z;

			geo.vertices[ 6 ].x = bb.min.x;
			geo.vertices[ 6 ].y = bb.min.y;
			geo.vertices[ 6 ].z = bb.min.z;

			geo.vertices[ 7 ].x = bb.min.x;
			geo.vertices[ 7 ].y = bb.min.y;
			geo.vertices[ 7 ].z = bb.max.z;
			geo.computeBoundingSphere();
			geo.verticesNeedUpdate = true;

			var mesh = new THREE.Mesh( geo, new THREE.MeshBasicMaterial( {wireframe : true} ) );

			return mesh;
		},
		// show wireframe
		'geometry' : function(geo){

		}, 
		'removeHelper' : function(obj, type){
			_.each(obj.children, function(child){
				if(child.__helper__ == type || type=='all'){
					obj.remove(child);
				}
			})
		}
	}

	//
	// 物件创建的函数
	//
	var objects = {
		'mesh' : {

			'cube' : (function(){
				var slot = 0;
				return function(){
					var geo = project.getAsset('/project/geometry/Cube').get('data');
					var mesh = project.getGeometryInstance( geo );
					return mesh;
				}
			})(),

			'sphere' : (function(){
				var slot = 0;
				return function(){
					var geo = project.getAsset('/project/geometry/Sphere').get('data');
					var mesh = project.getGeometryInstance(geo);
					return mesh;
				}
			})(),

			'plane' : (function(){
				var slot = 0;
				return function(){
					var geo = project.getAsset('/project/geometry/Plane').get('data');
					var mesh = project.getGeometryInstance(geo);
					return mesh;
				}
			})(),

			'cylinder' : (function(){
				var slot = 0;
				return function(){
					var geo = project.getAsset('/project/geometry/Cylinder').get('data');
					var mesh = project.getGeometryInstance(geo);
					return mesh;
				}
			})()
		},

		'light' : {

			'ambient' : (function(){
				var slot = 0;
				return function(){
					var light = new THREE.AmbientLight( 0xffffff );
					light.name = 'AmbientLight'+(slot++);

					return light;
				}
			})(),

			'directional' : (function(){
				var slot = 0;
				return function(){
					var light = new THREE.DirectionalLight(0xffffff);
					light.name = 'DirectionalLight_'+(slot++);

					return light;
				}
			})(),

			'point' : (function(){
				var slot = 0;
				return function(){
					var light = new THREE.PointLight( 0xffffff );
					light.name = 'PointLight_' + (slot++);

					return light;
				}
			})(),

			'spot' : (function(){
				var slot = 0;
				return function(){
					var light = new THREE.SpotLight( 0xffffff );
					light.name = 'SpotLight_'+(slot++);

					return light;
				}
			})
		},

		'camera' : {

			'perspective' : (function(){
				var slot = 0;
				return function(){
					var camera = new THREE.PerspectiveCamera( 60, 1, 0.1, 40 );
					camera.position.z = 20;
					camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
					camera.name = 'PerspectiveCamera_'+(slot++);

					return camera;
				}
			})(),

			'ortho' : (function(){
				var slot = 0;
				return function(){
					var camera = new THREE.OrthographicCamera( -50, 50, 50, -50, -50, 50 );
					camera.name = 'OrthoCamera_'+(slot++);

					return camera;
				}
			})()
		}
	}
	
	//移动，旋转，缩放等操作的辅助显示
	var transformHelper = {

		scene : null,

		position : null,

		boundingBox : null,

		init : function(){
			this.scene = new THREE.Scene;
			this.helper = new THREE.Object3D();
			var positionHelper = helpers.position();
			this.scene.add(this.helper);
			this.helper.add(positionHelper);
		},

		updateBoundingBox : function(node){

			if( this.boundingBox){
				this.scene.remove( this.boundingBox);
			}
			this.boundingBox = helpers.boundingBox(node);
			this.scene.add(this.boundingBox);
		},

		render : function(){
			
			if(selectedNode){

				this.helper.position.set(0, 0, 0);
				selectedNode.localToWorld(this.helper.position);
				this.helper.rotation.copy(selectedNode.rotation);
			
				//tranform
				if( this.boundingBox ){

					this.boundingBox.position.set(0, 0, 0);
					selectedNode.localToWorld(this.boundingBox.position);
					this.boundingBox.rotation.copy(selectedNode.rotation);
					this.boundingBox.scale.copy(selectedNode.scale);
				}
			}
			else{
			}
			// camera是在scene节点下的，
			// 不能直接变换scene
			renderer.render(this.scene, camera);
		}

	}

	var shaders = {
		'lightHelper' : {
			uniforms : {
				'color' : {'type':'c', value:new THREE.Color(0xf7c71f)},
				'texture' : {'type' : 't', value:null}
			},
			vertexShader : [
				'void main(){',
					'gl_PointSize = 20.0;',
					'gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0);',
				'}'
			].join('\n'),
			fragmentShader : [
				'uniform vec3 color;',
				'uniform sampler2D texture;',
				'void main(){',
					'gl_FragColor = vec4(color, 1.0) * texture2D(texture, gl_PointCoord.xy);',
				'}'
			].join('\n')
		}
	}

	///////////////////////////some functions modified from three.js
	// 坐标轴辅助显示
	var AxisHelper = function () {

		THREE.Object3D.call( this );

		var lineGeometry = new THREE.Geometry();
		lineGeometry.vertices.push( new THREE.Vector3() );
		lineGeometry.vertices.push( new THREE.Vector3( 0, 10, 0 ) );

		var coneGeometry = new THREE.CylinderGeometry( 0, 0.5, 2.0, 5, 1 );

		var line, cone;

		// x

		line = new THREE.Line( lineGeometry, new THREE.LineBasicMaterial( { color : 0xff0000 } ) );
		line.rotation.z = - Math.PI / 2;
		this.add( line );

		cone = new THREE.Mesh( coneGeometry, new THREE.MeshBasicMaterial( { color : 0xff0000 } ) );
		cone.position.x = 10;
		cone.rotation.z = - Math.PI / 2;
		this.add( cone );

		// y

		line = new THREE.Line( lineGeometry, new THREE.LineBasicMaterial( { color : 0x00ff00 } ) );
		this.add( line );

		cone = new THREE.Mesh( coneGeometry, new THREE.MeshBasicMaterial( { color : 0x00ff00 } ) );
		cone.position.y = 10;
		this.add( cone );

		// z

		line = new THREE.Line( lineGeometry, new THREE.LineBasicMaterial( { color : 0x0000ff } ) );
		line.rotation.x = Math.PI / 2;
		this.add( line );

		cone = new THREE.Mesh( coneGeometry, new THREE.MeshBasicMaterial( { color : 0x0000ff } ) );
		cone.position.z = 10;
		cone.rotation.x = Math.PI / 2;
		this.add( cone );

	};
	AxisHelper.prototype = Object.create( THREE.Object3D.prototype );

	// 鼠标控制摄像机
	var MouseControls = function ( object, domElement ) {

		object.eulerOrder = 'YXZ';
		
		var start = new THREE.Vector2(),
			offset = new THREE.Vector2(),
			rotating = false;
			panning = false;

		var panStart = new THREE.Vector2()

		var onMouseDown = function ( e ) {

			if(e.button == 0){

				rotating = true;
				start.set( e.clientX, e.clientY );
			}
			else if(e.button == 2 ){

				panning = true;
			}
		};

		var onMouseUp = function ( e ) {

			rotating = false;
			panning = false;
		};

		var onMouseMove = function ( e ) {

			offset.set( e.clientX-start.x, e.clientY-start.y );
			start.set( e.clientX, e.clientY );

			if(rotating){

				object.rotation.x += offset.y/1000;
				object.rotation.y += offset.x/1000;
			}
			if( panning){
				// get local axis from matrix
				var x = new THREE.Vector3();
				var y = new THREE.Vector3();

				var m = object.matrix.elements;
				x.set( m[0], m[1], m[2] );
				y.set( m[4], m[5], m[6] );
				var pan = x.setLength( -offset.x/20 ).addSelf( y.setLength( offset.y/20 ) );
				object.position.addSelf(pan);
			}
		};

		var onMouseWheel = function( e, delta, deltaX, deltaY ){
			// get local axis from matrix
			var z = new THREE.Vector3();

			var m = object.matrix.elements;
			z.set( m[8], m[9], m[10] );
			
			object.position.addSelf( z.setLength(-delta*2) );
		}

		domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

		domElement.addEventListener( 'mousemove', onMouseMove, false );
		domElement.addEventListener( 'mousedown', onMouseDown, false );
		domElement.addEventListener( 'mouseup', onMouseUp, false );

		$(domElement).mousewheel(onMouseWheel);

	};


	return {
		'getInstance' : getInstance
	}
})
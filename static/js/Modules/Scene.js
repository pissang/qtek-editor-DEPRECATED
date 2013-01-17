//================
// Scene.js
// 场景编辑器
//
// todo : load scene
//================

define(function(require, exports){

	var Panel = require('../Core/UIBase/Panel');
	var hub = require('../Core/Hub').getInstance();
	var Assets = require('../Core/Assets/index');
	var MouseEventDispatcher = require('../Core/MouseEventDispatcher');

	var FS = require('../Core/Assets/FileSystem');

	var Helpers = require('../Core/Helpers/index');


	var renderer,
		scene,

		// default camera light and material
		camera,
		defaultLight,
		defaultMaterial,

		view,
		controls,

		manipulatorHelper,

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
			renderer.shadowMapEnabled = true;

			camera = new THREE.PerspectiveCamera( 45, width/height, 0.1, 10000 );
			camera.__helper__ = true;

			defaultMaterial = Assets.Material.convertMaterial( new THREE.MeshLambertMaterial() );
			defaultMaterial.__default__ = true;
			defaultLight = new THREE.DirectionalLight(0xffffff);
			defaultLight.position.set(1, 1, 0);
			
			//scene
			scene = new THREE.Scene();
			scene.name = 'scene';

			//mouse event dispatcher
			mouseEventDispatcher = MouseEventDispatcher.create( scene, camera, renderer, false );

			//manipulator helper
			manipulatorHelper = Helpers.Manipulator.getInstance( renderer, camera );

			setInterval(function(){
				render();
			}, 20);

			init();

			view = new Panel.View;
			view.setName('Scene');
			view.$el.attr('id', 'SceneEditor');
			view.$list.append(renderer.domElement);

			hub.on('initialized:app', function(){

				hub.trigger('created:scene', scene);
				resize();
			})
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

		var offset = new THREE.Vector3();
		scene.on('mousedown', function(e){
			hub.trigger('select:node', e.sourceTarget);
		})
	}

	// set default light and material when 
	// there is no light in the scene

	// todo : need to move this part to WebGLRenderer
	function setDefaultScene(){
		// there is no light in the scene
		if(scene.__lights.length == 0){
			scene.add(defaultLight);
		}
	}

	function resetScene(){
		scene.remove(defaultLight);
	}

	function render(){
		// clear
		renderer.clear(true, true, true);
		
		// main scene pass
		setDefaultScene();
		renderer.render(scene, camera);
		resetScene();

		renderer.clear(false, true, false);
		manipulatorHelper.render();
	}

	// 
	// 处理所有从hub分配的事件
	// 如果是主动触发事件则统一为动名词，例如select:node create:mesh
	// 如果是事件完成后的回调事件则用过去式，如selected:node created:mesh
	// 
	// 触发顺序
	// 	create:mesh(light,camera)->   创建mesh(light,camera)
	//	created:mesh(light,camera)->
	//	add:node->        添加mesh到scene中
	//	added:node->
	//	select:node-> (是否需要自动选择？)
	//	selected:node
	function handleHubEvent(){

		hub.on('add:node', function(node, parent, silent){
			parent = scene.getNode(parent);
			if( ! parent ){
				parent = scene;
			}
			parent.add(node);
			node.traverse( function(_node){
				if(_node instanceof THREE.Mesh){
					_node.enablepicking = true;
					if( ! _node.material ){
						_node.material = defaultMaterial;
					}
					mouseEventDispatcher.updateScene();
				}
				else if(_node instanceof THREE.Light){
					
					// https://github.com/mrdoob/three.js/issues/598
					scene.traverse( function(node){
						if( node.material ){
							node.material.needsUpdate = true;
						}
					})

					lights.push(_node);
				}
				else if(_node instanceof THREE.Camera){

					hub.trigger('active:camera', _node);

				}

				_node.on('update:position', function(position,silent){
					if( position.x){
						hub.trigger('update:node', this, 'position.x', position.x, true);
					}
					if( position.y){
						hub.trigger('update:node', this, 'position.y', position.y, true);
					}
					if( position.z){
						hub.trigger('update:node', this, 'position.z', position.z, true);
					}
					if( ! silent){
						this.trigger('updated:position', position);
					}
				}, _node)
				_node.on('update:rotation', function(rotation,silent){
					if( rotation.x){
						hub.trigger('update:node', this, 'rotation.x', rotation.x, true);
					}
					if( rotation.y){
						hub.trigger('update:node', this, 'rotation.y', rotation.y, true);
					}
					if( rotation.z){
						hub.trigger('update:node', this, 'rotation.z', rotation.z, true);
					}
					if( ! silent){
						this.trigger('updated:rotation', rotation);
					}
				}, _node)
				_node.on('update:scale', function(scale,silent){
					if( scale.x){
						hub.trigger('update:node', this, 'scale.x', scale.x, true);
					}
					if( scale.y){
						hub.trigger('update:node', this, 'scale.y', scale.y, true);
					}
					if( scale.z){
						hub.trigger('update:node', this, 'scale.z', scale.z, true);
					}
					if( ! silent){
						this.trigger('updated:scale', scale);
					}
				}, _node)
			})
			
			if( ! silent){
				hub.trigger('added:node', node, parent);
			}
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
		hub.on('create:empty', function(){
			var node = objects['empty']();

			hub.trigger('created:empty', node);
			hub.trigger('add:node', node);
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
		hub.on('active:camera', function(camera, silent){

			camera = scene.getNode( camera );
			if( ! camera){
				return;
			}

			activeCamera = camera;
			if( ! silent){
				hub.trigger('actived:camera', camera);
			}
		})

		// 选择物体的事件
		// 选择后触发 hub.on('selected:light', function(){}) 事件
		hub.on('select:node', function(node, silent){
			node = scene.getNode(node);

			if( ! node){
				return;
			}
			selectedNode = node;

			manipulatorHelper.bind(node);
			hub.trigger('inspect:object', node.getConfig());

			if( ! silent){
				hub.trigger('selected:node', node);
			}
		})

		//使用选中摄像机查看视角
		hub.on('view:camera', function(_camera){

			_camera = scene.getNode( _camera );
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
		hub.on('remove:node', function(node, silent){

			node = scene.getNode(node);

			node.parent.remove(node);

			var materialNeedsUpdate = false;

			node.traverse( function(node){
				// https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Operators/instanceof?redirectlocale=en-US&redirectslug=Core_JavaScript_1.5_Reference%2FOperators%2FSpecial_Operators%2Finstanceof_Operator
				if(node instanceof THREE.Light){
					materialNeedsUpdate = true;
					_.without( lights, node );
				}
				else if(node instanceof THREE.Camera){
					_.without( cameras, node );
					if( node == activeCamera ){
						hub.trigger( 'active:camera', _.last(cameras) );
					}
				}
			})

			if( materialNeedsUpdate ){
				scene.traverse( function(node){
					if( node.material ){
						node.material.needsUpdate = true;
					}
				})
			}
			mouseEventDispatcher.updateScene();

			if( ! silent){
				hub.trigger('removed:node', node);
			}
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
			// query for the deepest field
			for(i = 0;  i < query.length-1; i++){
				item = item[ query[i] ];
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

			var node = scene.getNode( node );
			hub.trigger('update:object', node, query, value, silent);

			if( ! silent){
				//dispatch event to single node
				if(query.indexOf('position.') == 0){
					node.trigger('updated:position', query, value);
				}
				else if(query.indexOf('rotation.') == 0){
					node.trigger('updated:rotation', query, value);
				}
				else if(query.indexOf('scale.') == 0){
					node.trigger('updated:scale', query, value);
				}
			}
		})

		hub.on('update:material', function( mat, query, value, silent ){

			// 添加找不到material后输出的错误信息
			if( mat ){
				hub.trigger('updated:object', object, queryStr, value, valuePrev);
			}
		} )

		hub.on( 'update:selected', function(query, value, silent){

			hub.trigger('update:object', selectedNode, query, value, silent);
			
		} )
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
			material.uniforms.texture.value = THREE.ImageUtils.loadTexture('img/light.png');
			var helper = new THREE.ParticleSystem( geo, material);
			return helper;
		},
		'boundingBox' : function(node){
			var bb = Assets.Util.computeBoundingBox( node );
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
				var geo = new THREE.CubeGeometry( 10, 10, 10, 1, 1, 1);
				geo.name = 'cube';
				return function(){
					var mesh = Assets.Geometry.getInstance( geo );
					return mesh;
				}
			})(),

			'sphere' : (function(){
				var geo = new THREE.SphereGeometry( 5 ,20, 20);
				geo.name = 'sphere';
				return function(){
					var mesh = Assets.Geometry.getInstance( geo );
					return mesh;
				}
			})(),

			'plane' : (function(){
				var geo = new THREE.PlaneGeometry( 10, 10 );
				geo.name = 'plane';
				return function(){
					var mesh = Assets.Geometry.getInstance( geo );
					return mesh;
				}
			})(),

			'cylinder' : (function(){
				var geo = new THREE.CylinderGeometry( 5, 5, 5, 20 );
				geo.name = 'cylinder';
				return function(){
					var mesh = Assets.Geometry.getInstance( geo );
					return mesh;
				}
			})()
		},

		'empty' : (function(){
			var id = 0;
			return function(){
				var node = new THREE.Object3D();
				node.name = 'node_'+(id++);
				return node;
			}
		})(),

		'light' : {

			'ambient' : (function(){
				var id = 0;
				return function(){
					var light = new THREE.AmbientLight( 0xffffff );
					light.name = 'ambientlight_'+(id++);

					return light;
				}
			})(),

			'directional' : (function(){
				var id = 0;
				return function(){
					var light = new THREE.DirectionalLight(0xffffff);
					light.name = 'directionallight_'+(id++);
					
					return light;
				}
			})(),

			'point' : (function(){
				var id = 0;
				return function(){
					var light = new THREE.PointLight( 0xffffff );
					light.name = 'pointlight_' + (id++);

					return light;
				}
			})(),

			'spot' : (function(){
				var id = 0;
				return function(){
					var light = new THREE.SpotLight( 0xffffff );
					light.name = 'spotlight_'+(id++);

					return light;
				}
			})
		},

		'camera' : {

			'perspective' : (function(){
				var id = 0;
				return function(){
					var camera = new THREE.PerspectiveCamera( 60, 1, 0.1, 40 );
					camera.position.z = 20;
					camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
					camera.name = 'perspectivecamera_'+(id++);

					return camera;
				}
			})(),

			'ortho' : (function(){
				var id = 0;
				return function(){
					var camera = new THREE.OrthographicCamera( -50, 50, 50, -50, -50, 50 );
					camera.name = 'orthocamera_'+(id++);

					return camera;
				}
			})()
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

	// 鼠标控制摄像机
	var MouseControls = function ( object, domElement ) {

		object.eulerOrder = 'YXZ';
		
		var start = new THREE.Vector2(),
			offset = new THREE.Vector2(),
			rotating = false;
			panning = false;

		var panStart = new THREE.Vector2()

		var onMouseDown = function ( e ) {

			if(e.button == 2){

				rotating = true;
				start.set( e.clientX, e.clientY );
			}
			else if(e.button == 1 ){

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

		var onMouseOut = function(e){
			rotating = false;
			panning = false;
		}

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
		domElement.addEventListener( 'mouseout', onMouseOut, false );

		$(domElement).mousewheel(onMouseWheel);

	};


	return {
		'getInstance' : getInstance
	}
})
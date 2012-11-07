//=================
// Manipulator.js
//=================
define(function(require, exports, module){

	var scene;
	var MouseEventDispatcher = require('../MouseEventDispatcher');

	var mode,
		helperContainer,
		helpers = {
			move : null,
			// rotate : null,
			// scale : null
		},

		renderer,
		camera,

		mouseEventDispatcher;

	var instance;

	function getInstance(renderer, camera){

		// change renderer and camera
		renderer = renderer;
		camera = camera;

		if( instance ){

			return instance;
		}

		scene = new THREE.Scene();

		helperContainer = new THREE.Object3D(),
		helpers['move'] = new PositionHelper(),
		// helpers['rotate'] = new RotationHelper(),
		// helpers['scale'] = new ScaleHelper();

		helperContainer.add(helpers['move']);
		// helperContainer.add(helpers['rotate']);
		// helperContainer.add(helpers['scale']);

		scene.add(helperContainer)
		var dLight = new THREE.DirectionalLight(0xffffff);
		dLight.position.set(1, 1, 0);
		scene.add(dLight);

		mouseEventDispatcher = MouseEventDispatcher.create( scene, camera, renderer, false);
		mouseEventDispatcher.updateScene();
		handleInteraction();

		var	target = null;

		function updatePosition(){

			helperContainer.position.set(0, 0, 0);
			target.localToWorld( helperContainer.position );

		}

		instance = {

			useMode : function(_mode){
				mode = _mode.toLowerCase();
				_.each(helpers, function(helper){
					helper.visible = false;
				})
				helpers[mode].visible = true;
			},

			bind : function(object){

				target = object;

				object.off('updated:position', updatePosition);
				object.on('updated:position', updatePosition, object);
			},

			render : function(renderer, camera){

				renderer.render( scene, camera );

			},

			setRenderer : function(_renderer){
				renderer = _renderer;
			},

			setCamera : function(_camera){
				camera = _camera;
			}
		}

		instance.useMode( 'move' );

		return instance;
	}

	function handleInteraction(){

		var axisX = helpers['move'].getChildByName('axis-x');
		axisX.on('mousedown', function(e){
			
		})

	}

	// for move manipulation
	var PositionHelper = function () {

		THREE.Object3D.call( this );

		var lineGeometry = new THREE.Geometry();
		lineGeometry.vertices.push( new THREE.Vector3() );
		lineGeometry.vertices.push( new THREE.Vector3( 0, 10, 0 ) );

		var coneGeometry = new THREE.CylinderGeometry( 0, 0.5, 2.0, 5, 1 );

		var xAxis = new THREE.Object3D();
		xAxis.name = 'axis-x';
		xAxis.rotation.z = -Math.PI/2;
		var line = new THREE.Line( lineGeometry, new THREE.LineBasicMaterial( { color : 0xff0000 } ) );
		var cone = new THREE.Mesh( coneGeometry, new THREE.MeshPhongMaterial( { color : 0xff0000 } ) );
		cone.enablepicking = true;
		cone.position.y = 10;
		xAxis.add( line );
		xAxis.add( cone );

		var yAxis = new THREE.Object3D();
		yAxis.name = 'axis-y';
		var line = new THREE.Line( lineGeometry, new THREE.LineBasicMaterial( { color : 0x00ff00 } ) );
		var cone = new THREE.Mesh( coneGeometry, new THREE.MeshPhongMaterial( { color : 0x00ff00 } ) );
		cone.enablepicking = true;		
		cone.position.y = 10;
		yAxis.add( line );
		yAxis.add( cone );

		var zAxis = new THREE.Object3D();
		zAxis.name = 'axis-z';
		zAxis.rotation.x = -Math.PI/2;
		var line = new THREE.Line( lineGeometry, new THREE.LineBasicMaterial( { color : 0x0000ff } ) );
		var cone = new THREE.Mesh( coneGeometry, new THREE.MeshPhongMaterial( { color : 0x0000ff } ) );
		cone.enablepicking = true;
		cone.position.y = 10;
		zAxis.add( line );
		zAxis.add( cone );

		this.add(xAxis);
		this.add(yAxis);
		this.add(zAxis);

	};
	PositionHelper.prototype = Object.create( THREE.Object3D.prototype );

	// for rotate manipulation
	var RotationHelper = function(){

	}
	RotationHelper.prototype = Object.create( THREE.Object3D.prototype );

	// for scale manipulation
	var ScaleHelper = function(){

	}
	ScaleHelper.prototype = Object.create( THREE.Object3D.prototype );

	exports.getInstance = getInstance;
})

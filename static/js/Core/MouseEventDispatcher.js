//=================================
// MouseEventDispatcher.js
// 鼠标对场景操作的事件获取和分发中心
//================================

define(function(require, exports){

	var AssetUtil = require('./Assets/Util');

	function create( scene, camera, renderer, gpupicking){

		var	gpupicking = _.isUndefined( gpupicking ) ? true : gpupicking,

			width = renderer.domElement.width,
			height = renderer.domElement.height,

			pickingObjects = [],
			picking,
			
			//for gpu picking
			pickingRt,

			//for ray picking
			projector = new THREE.Projector();


		// todo rendertarget的大小是否需要和draw buffer一样？
		pickingRt = new THREE.WebGLRenderTarget( width, height );
		pickingRt.generateMipmaps = false;


		var picking = null,
			mouseOver = null,
			$el = $(renderer.domElement),

			prevX, prevY,
			dragging = null;
		
		// register all events listener of the canvas
		$el.mousedown(function(e){
			var x = e.offsetX,
				y = e.offsetY,
				prop = {
					x : x,
					y : y
				}

			var obj = _pick( x, y );
			
			if( ! gpupicking){
				
				if( obj ){	
					var res = obj;
					obj = res.object;
					prop.pickinfo = res;
				}
			}

			if( obj ){
				MouseEvent.throw('mousedown', obj, prop);
			
				//dragstart
				MouseEvent.throw('dragstart', obj, prop);
				prevX = x;
				prevY = y;
				dragging = obj;
			}
		})
		.mousemove(function(e){

			var x = e.offsetX,
				y = e.offsetY,
				prop = {
					x : x,
					y : y
				}

			var obj = _pick( x, y);
			
			if( ! gpupicking){

				if( obj ){	
					var res = obj;
					obj = res.object;
					prop.pickinfo = res;
				}
			}

			if( obj ){

				MouseEvent.throw('mousemove', obj, prop)
				if( obj != mouseOver){
					// mouse first on this object
					MouseEvent.throw('mouseover', obj, prop)
					if( mouseOver ){
						MouseEvent.throw('mouseout', mouseOver, prop)
					}
					mouseOver = obj;
				}

			}
			else if( mouseOver ){
				// move out the object
				MouseEvent.throw('mouseout', mouseOver, prop);
				mouseOver = null;
			}

			//dragging
			if( dragging ){
				_.extend(prop, {
					prevX : prevX,
					prevY : prevY,
					offsetX : x - prevX,
					offsetY : y - prevY
				});
				prevX = x;
				prevY = y;
				MouseEvent.throw('drag', dragging, prop);
			}
		})
		.mouseup(function(e){

			var x = e.offsetX,
				y = e.offsetY,
				prop = {
					x : x,
					y : y
				}

			var obj = _pick( x, y);

			if( ! gpupicking){
				
				if( obj ){	
					var res = obj;
					obj = res.object;
					prop.pickinfo = res;
				}
			}

			MouseEvent.throw('mouseup', obj, prop);

			//drag stop
			if( dragging ){
				MouseEvent.throw('dragend', dragging, prop);
				dragging = null;
			}
		});

		// 基于GPU的拾取
		function _pick(x, y){

			var object;
			if( gpupicking ){

				_swapMaterial();
				var pixel = new Uint8Array(4);
				var gl = renderer.getContext();
				renderer.render(scene, camera, pickingRt);
				gl.readPixels(x, height-y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
				var id = (pixel[0] << 16) | (pixel[1] << 8) | (pixel[2]);
				_swapMaterial();
				
				if(id){
					object = pickingObjects[id-1];
				}
			}
			else {

				x = (x/width)*2-1;
				y = -(y/height)*2+1;
				var ray = projector.pickingRay(new THREE.Vector3(x, y, 0.5), camera);
				var intersects = ray.intersectObjects( pickingObjects );

				if( intersects.length > 0){
					var object = intersects[0];
				}
			}
			return object;
		}

		function _swapMaterial(){
			_.each(pickingObjects, function(mesh){
				var mat = mesh.material;
				mesh.material = mesh.__idmaterial__;
				mesh.__idmaterial__ = mat;
			})
		}
		// 监视canvas的大小变化
		function resize(){

			if( width == renderer.domElement.width &&
				height == renderer.domElement.height){
				return;
			}
			width = renderer.domElement.width;
			height = renderer.domElement.height;

			pickingRt = new THREE.WebGLRenderTarget( width, height );
			pickingRt.generateMipmaps = false;
			
		}

		var interval = setInterval(function(){
			resize();
		}, 100);


		//scene场景改变(添加或删除了物体)后对所有pickingobject的id的更新
		function updateScene(){

			pickingObjects = [];

			scene.traverse( function(node){

				if( node instanceof THREE.Mesh && node.enablepicking ){

					pickingObjects.push( node );
				}
			})

			_.each( pickingObjects, function(node, index){

				// material for picking, color is the index of this node
				if( ! node.__idmaterial__ ){
					node.__idmaterial__ = new THREE.MeshBasicMaterial();
				}
				node.__idmaterial__.color = new THREE.Color( index +1 );
			})
		}

		return {

			resize : resize,

			updateScene : updateScene,

			dispose : function(){
				clearInterval( interval );
			}

		}
	}

	function MouseEvent(props){

		this.cancelBubble = false;

		_.extend(this, props);
	}

	MouseEvent.prototype.stopPropagation = function(){
		
		this.cancelBubble = true;
	}

	MouseEvent.throw = function(eventType, target, props){

		var e = new MouseEvent(props);
		e.sourceTarget = target;

		// enable bubble
		while(target && !e.cancelBubble ){
			e.target = target;
			target.trigger(eventType, e);

			target = target.parent;
		}
	}

	return {

		create : create
	}
} )
//=================================
// MouseEventDispatcher.js
// 鼠标对场景操作的事件获取和分发中心
// 
// 鼠标对场景物体的拖拽 dragstart drag drop
// 鼠标对场景物体的点击 click
// 鼠标移到场景物体上 hover 考虑性能问题是可选项
// 
// 事件在scene对象上分发，不像其它多数操作从hub上统一分发
//================================

define(function(require, exports){

	var AssetUtil = require('../Core/Assets/Util');
		hub = require('../Core/Hub').getInstance();

	function create( scene, camera, renderer, gpupicking){

		_.extend(scene, Backbone.Events);

		var	gpupicking = _.isUndefined( gpupicking ) ? true : gpupicking,

			width = renderer.domElement.width,
			height = renderer.domElement.height,

			picking,
			pickingObjects = [],
			pickingRt;
			

		// todo rendertarget的大小是否需要和draw buffer一样？
		pickingRt = new THREE.WebGLRenderTarget( width, height );
		pickingRt.generateMipmaps = false;

		// drag status
		var dragTarget = null,
			$el = $(renderer.domElement),
			startX, startY;
		
		// register all events listener of the canvas
		$el.mousedown(function(e){
			var x = e.offsetX,
				y = e.offsetY;

			var obj = _pick( x, y );
			
			if( obj ){
				dragTarget = obj;
				startX = x;
				startY = y;
				scene.trigger('dragstart', {
					target : dragTarget,
					x : x,
					y : y
				})
			}
		})
		.mousemove(function(e){

			if( dragTarget ){
				
				var x = e.offsetX,
					y = e.offsetY,
					offsetX = x - startX,
					offsetY = y - startY;

				scene.trigger('drag', {
					target : dragTarget,
					x : x,
					y : y,
					offsetX : offsetX,
					offsetY : offsetY
				})
			}
		})
		.mouseup(function(e){

			if( dragTarget ){
				scene.trigger('drop', {
					target : dragTarget,
					x : e.offsetX,
					y : e.offsetY
				})
			}
			dragTarget = null;
		});

		$el.click(function(e){

		});

		// 基于GPU的拾取
		function _pick(x, y){
			_swapMaterial();
			var pixel = new Uint8Array(4);
			var gl = renderer.getContext();
			renderer.render(scene, camera, pickingRt);
			gl.readPixels(x, height-y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
			var id = (pixel[0] << 16) | (pixel[1] << 8) | (pixel[2]);
			_swapMaterial();
			
			var object;
			if(id){
				object = pickingObjects[id-1];
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

			width = renderer.domElement.width;
			height = renderer.domElement.height;

			pickingRt = new THREE.WebGLRenderTarget( width, height );
			pickingRt.generateMipmaps = false;
			
		}

		//scene场景改变(添加或删除了物体)后对所有pickingobject的id的更新
		function updateScene(){

			pickingObjects = [];

			scene.traverse( function(node){

				if( node instanceof THREE.Mesh && node.enablepicking && node.visible ){

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

			updateScene : updateScene
		}
	}

	return {

		create : create
	}
} )
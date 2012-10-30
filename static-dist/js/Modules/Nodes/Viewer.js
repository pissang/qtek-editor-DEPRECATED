// 因为context之间不能分享资源的原因
// 这里只能使用使用gl.readPixels方法读取出来显示到canvas里
define(function(reqUIBasere, exports, module){

	var Base = reqUIBasere('./Base');
	var Layer = reqUIBasere('../../Core/UIBase/Layer');
	var Label = reqUIBasere('../../Core/UIBase/Label');

	var Node = function(name, renderer){

		Base.Node.call(this, name);

		this.renderer = renderer;
		//todo 这个PostProcssing也需要改一改
		this.postProcessing = new PostProcessing({
			'inputPin' : {
				'tInput' : null
			},
			'fragmentShader' : [
				'uniform sampler2D tInput;',
				'varying vec2 vUv;',
				'void main(){',
					'gl_FragColor = texture2D(tInput, vec2(vUv.x, 1.0-vUv.y));',
				'}'
			].join('\n'),
			'outputPin' : this._renderTarget
		});

		this.inputs = {
			'input' : function(sourceData){
				this.postProcessing.setInputPin('tInput', sourceData);
			}
		}

	}

	Base.Node.inherit(Node, {
		// @override
		init : function(){
			
			var self = this;
			Base.Node.prototype.init.call(this);

			this.__output__ = true;

			var inputView = new Label.View;
			inputView.model.set({
				name : 'input',
				value : 'input'
			});
			var canvasView = new Layer.View;

			this._canvas = document.createElement('canvas');
			canvasView.$el.append(this._canvas);
			this.parameterLayerView.appendView(inputView);
			this.parameterLayerView.appendView(canvasView);

			this.inputPins.add([{
				name : 'input'
			}]);

			// init 2d context
			this._canvasContext = this._canvas.getContext('2d');
			// setsize
			this.resize(200, 200);
		},
		// resize all the context
		resize : function(width, height){
			this._width = width;
			this._height = height;
			this._canvas.width = width;
			this._canvas.height = height;
			if(this._canvasContext){
				this._canvasImageData = this._canvasContext.createImageData(width, height);
			}
			//todo 几个viewer应该共用一个rendertarget
			//为什么rendertarget的width和height设得大一点就只能显示一部分？
			this._renderTarget = new THREE.WebGLRenderTarget( this._width, this._height );
			if(this.postProcessing){
				this.postProcessing.setOutputPin(this._renderTarget);
			}
		},

		exec : function(){
			// set view port 400*400
			// todo: 可以将不同的viewer设置到不同的viewport区域上一块渲染 不用每个view渲染后clear整个drawing buffer
			this.renderer.setViewport(0, 0, this._width, this._height);

			this.postProcessing.render(this.renderer);
			var gl = this.renderer.getContext();
			gl.readPixels(0, 0, this._width, this._height, gl.RGBA, gl.UNSIGNED_BYTE, this._canvasImageData.data);
			// reset view port
			this.renderer.setViewport();

			this._canvasContext.clearRect(0, 0, this._width, this._height);
			this._canvasContext.putImageData(this._canvasImageData, 0, 0);
		}
	})

	exports.Node = Node;
})
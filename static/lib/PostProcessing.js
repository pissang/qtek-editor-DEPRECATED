//author shenyi01@baidu.com

var PostProcessing = function(parameters){

	var self = this;

	this.name  = '';
	/**
	 * postprocessing的一个node的输入端
	 * Backbone.Collection[Backbone.Model]
	 */
	this.inputPin = new Backbone.Collection;

	/**
	 * postprocessing的一个node的参数
	 * Backbone.Collection[Backbone.Model(name, type, x, y, z, xy, xyz, xyzw, texture)]
	 */
	this.parameters = new Backbone.Collection;
	/**
	 * postprocessing的一个node的输出端
	 * Backbone.Model
	 */
	this.outputPin = new Backbone.Model({
		name : 'output',
		texture : null
	});
	/**
	 * Backbone.Model
	 */
	this.fragmentShader = new Backbone.Model({
		name : 'fragment shader'
	});

	this._material = new THREE.ShaderMaterial({
		vertexShader : ['varying vec2 vUv;',
							'void main(){',
								'vUv = vec2(uv.x, uv.y);',
								'gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
							'}'
						].join('\n')
	});

	parameters = parameters || {};

	//bind data
	this.initialize(parameters);

	//
	this._camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, -10000, 10000 );
	this._geometry = new THREE.PlaneGeometry( 1, 1 );
	// this._geometry.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / 2 ) );

	this._quad = new THREE.Mesh( this._geometry, this._material );
	this._quad.position.z = -100;
	this._quad.scale.set( window.innerWidth, window.innerHeight, 1 );

	this._scene = new THREE.Scene();
	this._scene.add( this._quad );
	this._scene.add( this._camera );
}

PostProcessing.prototype = {

	initialize : function(parameters){
		var self = this;

		this.bindingEvent();

		_.each(parameters.inputPin, function(item, name){

			self.setInputPin(name, item);
		})

		_.each(parameters.parameters, function(item, name){
			var model = new Backbone.Model({
				name : name,
				type : item.type,
				x : item.value.x || item.value,
				y : item.value.y,
				z : item.value.z,
				w : item.value.w
			})
			self.parameters.push(model);
		})

		if(parameters.outputPin){
			this.outputPin = new Backbone.Model({
				texture : parameters.outputPin
			})
		}
		if(parameters.fragmentShader){
			this.setFragmentShader(parameters.fragmentShader);
		}

	},

	bindingEvent : function(){

		this.inputPin.on('add', function(model){

			this._material.uniforms[model.get('name')] = {
				type : 't', 
				value : model.get('texture')
			}
		}, this);

		this.inputPin.on('remove', function(model){

			delete this._material.uniforms[model.get('name')];
		}, this);

		this.inputPin.on('change:texture', function(model){

			this._material.uniforms[model.get('name')].value = model.get('texture');
		}, this);

		this.parameters.on('add', function(model){
			var value, texture;
			switch(model.get('type')){
				case 'f':
					value = model.get('x');
					break;
				case 'v2':
					value = new THREE.Vector2(model.get('x'), model.get('y'));
					break;
				case 'v3':
					value = new THREE.Vector3(model.get('x'), model.get('y'), model.get('z'));
					break;
				case 'v4':
					value = new THREE.Vector4(model.get('x'), model.get('y'), model.get('z'), model.get('w'));
					break;
				case 't':
					value = model.get('texture');
					break
				default:
					break;
			}

			this._material.uniforms[model.get('name')] = {
				type : model.get('type'),
				value : value
			}
		}, this);
		
		this.parameters.on('remove', function(model){

			delete this._material.uniforms[model.get('name')];
		}, this);

		this.parameters.on('change:x', function(model){
			var item = this._material.uniforms[model.get('name')];

			if(item.value && item.value.x){
				item.value.x = model.get('x');
			}else{
				item.value = model.get('x');
			}
		}, this);
		this.parameters.on('change:y', function(model){
			this._material.uniforms[model.get('name')].value.y = model.get('y');
		}, this);
		this.parameters.on('change:z', function(model){
			this._material.uniforms[model.get('name')].value.z = model.get('z');
		}, this);
		this.parameters.on('change:w', function(model){
			this._material.uniforms[model.get('name')].value.w = model.get('w');
		});
		this.parameters.on('change:xy', function(model){
			model.set('x', model.get('xy')[0]);
			model.set('y', model.get('xy')[1]);
		}, this);
		this.parameters.on('change:xyz', function(model){
			model.set('x', model.get('xyz')[0]);
			model.set('y', model.get('xyz')[1]);
			model.set('z', model.get('xyz')[2]);
		}, this);
		this.parameters.on('change:xyzw', function(model){
			model.set('x', model.get('xyzw')[0]);
			model.set('y', model.get('xyzw')[1]);
			model.set('z', model.get('xyzw')[2]);
			model.set('w', model.get('xyzw')[3]);
		}, this);

		this.parameters.on('change:texture', function(model){
			this._material.uniforms[mode.get('name')].texture = model.get('texture');
		}, this);

		this.fragmentShader.on('change:shaderString', function(){

			this._material.fragmentShader = this.fragmentShader.get('shaderString');
			this._material.needsUpdate = true;
		}, this);
	},

	setInputPin : function(key, texture){
		var model = this.inputPin.where({name : key})[0];
		if(model){
			model.set('texture', texture);
		}else{
			this.inputPin.push(new Backbone.Model({

				name : key,
				texture : texture,

			}));
			return;
		}
	},

	removeInputPin : function(key){
		var model = this.inputPin.where({name:key})[0];
		this.inputPin.remove(model);
	},

	setOutputPin : function(texture){
		this.outputPin.set('texture', texture);
	},

	removeOutputPin : function(){

		this._outputPin.set('texture', null);
	},

	setFragmentShader : function(shaderString){

		this.fragmentShader.set('shaderString', shaderString);
	},

	setVertexShader : function(shaderString){

		this._material.vertexShader = shaderString;
	},

	updateParameter : function(name, value){
		var model = this.parameters.where({name : name})[0];
		if(_.isNumber(value)){
			model.set('x', value);
		}
		if(_.isArray(value)){
			switch(value.length){
				case 2:
					model.set('xy', value);
				case 3:
					model.set('xyz', value);
				case 4:
					model.set('xyzw', value);
			}
		}
	},
	render : function(renderer, output){

		if(this.outputPin.get('texture') && !output){

			renderer.render(this._scene, this._camera, this.outputPin.get('texture'), true);
		}else{
			
			renderer.render(this._scene, this._camera)
		}
	}
}

PostProcessing.TexturePool = {

	_pool : [],

	parameters : new Backbone.Model({
		width : 512,
		height : 512
	}),

	get : function(){
		if( this._pool.length == 0){

			var param = this.parameters;

			return new THREE.WebGLRenderTarget( param.get('width'), param.get('height'), {
				wrapS : param.get('wrapS'),
				wrapT : param.get('wrapT'),
				magFilter : param.get('magFilter'),
				minFilter : param.get('minFilter'),
				format : param.get('format'),
				type : param.get('type'),
				offset : param.get('offset'),
				repeat : param.get('repeat')
			} );
		}

		return this._pool.pop();
	},

	put : function(rt){

		_.each(this._pool, function(item){
			if(item == rt){
				return;
			}
		})
		this._pool.put(rt);
	}
}
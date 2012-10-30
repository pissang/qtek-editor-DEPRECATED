//========================
// Texture.js
//
// Texture Asset
// Save an texture instance, which can be imported and exported as a json format asset and images
// file extension texture
//========================
define(function(require, exports, module){

	var imageCache = {};

	var guid = 0;

	function create(texture){

		var name = texture && texture.name;

		return {

			type : 'texture',

			name : name || 'Texture_' + guid++,

			data : texture || null,

			rawdata : '',

			import : function(json){
				this.data = read(json);
				this.rawdata = json;

				if( json.name ){
					this.name = json.name;
				}

				return this.data;
			},

			export : function(){
				return toJSON( this.data );
			},
			getInstance : function(){
				return this.data;
			},
			getCopy : function(){
				return getCopy( this.data );
			}
		}
	}

	function read(json){
		
		var texture = new THREE.Texture({
			wrapS : t.wrapS,
			wrapT : t.wrapT,
			magFilter : t.magFilter,
			minFilter : t.minFilter,
			anisotropy : t.anisotropy,
			format : t.format,
			type : t.type,
			offset : new THREE.Vector2( t.offset[0], t.offset[1] ),
			repeat : new THREE.Vector2( t.repeat[1], t.repeat[1] )
		});

		var imgSrc = json.image
		// don't cache base 64 format
		if( imgSrc.indexOf('data:image/')==0 ){
			var img = new Image();
			img.onload = function(){
				texture.needsUpdate = true;
			}
			img.src = imageSrc;
			texture.image = img;
		}
		else if( imgSrc ){
			if( imageCache[ imgSrc ] ){
				texture.image = imageCache[ imgSrc];
			}else{
				var img = new Image();
				img.onload = function(){
					texture.needsUpdate = true;
				}
				img.src = imageSrc;
				texture.image = img;
				imageCache[imgSrc] = img;
			}

		}

		return texture;
	}

	function toJSON( texture ){
		
		var json = {};

		// todo cube texture?
		_.extend(json, {
			'image' : texture.image.src,	//data url todo needs save texture depedently
			'wrapS' : texture.wrapS,
			'wrapT' : texture.wrapT,
			'magFilter' : texture.magFilter,
			'minFilter' : texture.minFilter,
			'anisotropy' : texture.anisotropy,
			'format' : texture.format,
			'type' : texture.type,
			'offset' : [texture.offset.x, texture.offset.y],
			'repeat' : [texture.repeat.x, texture.repeat.y]
		});

		return json;
	}

	function getInstance(){
		this.data.needsUpdate = true;
		return this.data;
	}

	function getCopy( texture ){
		return texture.clone();
	}

	exports.create = create;
	// static functions
	exports.export = toJSON;

	exports.getCopy = getCopy;
})
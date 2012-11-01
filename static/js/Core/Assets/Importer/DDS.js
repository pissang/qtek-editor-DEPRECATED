//=========================
//	DDS.js
//	import from dds format files
//==========================

define(function(require, exports, module){

	var TextureAsset = require('../Texture');

	exports.import = function(name, data, folder){

		var dds = THREE.ImageUtils.parseDDS( data, true);
		
		// almost from THREE.ImageUtils.loadCompressedTexture
		var texture = new THREE.CompressedTexture();

		texture.name = name;
		texture.format = dds.format;
		texture.mipmaps = dds.mipmaps;
		// image.width, image.height is useless for webgl renderer
		// renderer will use mimaps instead of image property
		texture.image.width = dds.width;
		texture.image.height = dds.height;
		// tell renderer not to generate mip maps
		texture.generateMipmaps = false;

		var texFolder = folder.createFolder('textures');
		var texAsset = TextureAsset.create(texture);

		texFolder.createFile(texAsset.name, texAsset);

		return texAsset;
	}

	exports.importFromFile = function(file, folder, callback){

		var reader = new FileReader();
		reader.onload = function(evt){

			if( evt.target.readyState == FileReader.DONE ){

				var res = exports.import( file.name, evt.target.result, folder);
				callback && callback(res);
			}
		}
		reader.readAsArrayBuffer( file );
	}

	exports.importFromURL = function(url, folder, callback){
		
	}
})
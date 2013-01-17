//=====================
// FileSystem.js
// simulate a file system simply
// Todo : add FileSystem api support and save data on hdd
//=====================
define(function(require, exports, module){

	var File = function(name, asset){

		this.type = 'file';
		this.name = name || '';
		
		this.data = null;
		if(asset){
			this.attach( asset, true );
		}

		this.parent = null;
	}

	_.extend(File.prototype, Backbone.Events);

	File.prototype.getRoot = function(){
		var root = this;
		while(root.parent){
			root = root.parent;
		}
		return root;
	}
	File.prototype.setName = function(name, silent){
		if( ! silent){
			// trigger before it is really updated
			this.getRoot().trigger('updated:name', this, name);
		}

		this.name = name;
	
	}
	File.prototype.attach = function(asset, silent){
		this.data = asset;
		asset.host = this;

		if( ! silent){
			this.getRoot().trigger('attached:asset', this, asset);
		}
	}
	File.prototype.detach = function(silent){
		this.data = null;
		asset.host = null;

		if( ! silent){
			this.getRoot().trigger('detached:asset', this);
		}
	}
	File.prototype.getPath = function(){
		if( ! this.parent ){
			return this.name;
		}
		return this.parent.getPath() + this.name;
	}

	var Folder = function(name){

		this.name = name || '';

		this.type = 'folder'

		this.children = [];
	}

	_.extend(Folder.prototype, Backbone.Events);

	Folder.prototype.setName = function(name, silent){
		if( ! silent){
			// trigger before it is really updated
			this.getRoot().trigger('updated:name', this, name);
		}

		this.name = name;
	}
	Folder.prototype.getRoot = function(){
		var root = this;
		while(root.parent){
			root = root.parent;
		}
		return root;
	}
	Folder.prototype.add = function(node, silent){

		var isMove = false;

		if(node.parent){
			isMove = true;

			if(node.parent == this){
				return;
			}
			node.parent.remove(node, true);
		}
		this.children.push( node );

		if(isMove){
			var parentPrev = node.parent;
		}
		node.parent = this;

		if( ! silent){
			if( isMove ){
				this.getRoot().trigger('moved:node', this, parentPrev, node);
			}else{
				this.getRoot().trigger('added:node', this, node);
			}
		}
	}
	Folder.prototype.remove = function(node, silent){
		if( _.isString(node) ){
			node = this.find(node);
		}
		// call before the node is really removed
		// because we still need to get node path 
		if( ! silent){

			this.getRoot().trigger('removed:node', this, node);
		}

		node.parent = null;
		_.without( this.children, node);

	}
	// traverse the folder
	Folder.prototype.traverse = function(callback){
		callback && callback( this );
		_.each( this.children, function(child){
			child.traverse( callback );
		} )
	}
	// get the folder's absolute path
	Folder.prototype.getPath = function(){
		if( ! this.parent ){
			return this.name + '/';
		}
		return this.parent.getPath() + this.name + '/';
	}
	// find a folder or file 
	Folder.prototype.find = function(path){
		if( ! path){
			return;
		}
		var root = this;
		// abosolute path
		if( path.charAt(0) == '/'){
			path = path.substring(1);
			root = exports.root;
		}
		return _.reduce( _.compact(path.split('/')), function(node, name){
			if( ! node){
				return;
			}
			if( name == '..'){
				return node.parent;
			}
			else if( name =='.'){
				return node;
			}
			else{
				return _.find(node.children, function(item){
					return item.name==name
				});
			}
		}, root);
	}
	Folder.prototype.createFolder = function(path, silent){
		path = _.compact(path.split('/'));
		var ret = _.reduce(path, function(node, name){
			var folder = node.find(name);
			if( !folder ){
				folder = new Folder(name);
				node.add( folder, silent );
			}
			return folder;
		}, this);

		if( ! silent){

			this.getRoot().trigger('created:folder', this, ret);
		}
		return ret;
	}
	Folder.prototype.createFile = function(path, asset, silent){
		dir = _.compact(path.split('/'));
		var fileName = dir.pop();
		var folder = this.createFolder(dir.join('/'), silent);
		var file = folder.find(fileName);
		if( ! file){
			file = new File( fileName, asset );

			folder.add( file, silent );

			if( ! silent){
				this.getRoot().trigger('created:file', this, file);
			}
		}

		return file;
	}

	var Root = function(){
		Folder.call(this);
	};
	Root.prototype = new Folder;
	Root.prototype.getPath = function(){
		return '/';
	}

	exports.root = new Root();
	exports.Folder = Folder;
	exports.File = File;
})
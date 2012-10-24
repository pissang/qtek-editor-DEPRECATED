//=====================
// Tree.js
// tree view
//=====================
define(function(require, exports, module){

	// data structure
	// + type : file|folder
	// + name : ""
	// + icon : "" 	icon class
	// + owner
	// + children : []	if type is folder
	// + meta :
	// + + source
	// + + assetType | nodeType
	var Model = Backbone.Model.extend({
		defaults : {
			json : []
		}
	});

	var File = function(name){

		this.type = 'file';
		this.name = name;
		this.owner = "";

		this.meta = {};	//json source

		this.$el = null;
	}

	_.extend(File.prototype, Backbone.Events);

	File.prototype.getRoot = function(){
		var root = this;
		while(root.parent){
			root = root.parent;
		}
		return root;
	}
	File.prototype.genElement = function(){

		var html = _.template('<li class="lblend-tree-file">\
						<span class="lblend-tree-title" draggable="true">\
							<span class="{{icon}}"></span>\
							{{name}}\
						</span>\
					</li>', {
						icon : this.icon,
						name : this.name
					})
		var $el = $(html);
		this.$el = $el;

		var self = this;

		// draggable
		$el[0].addEventListener('dragstart', function(e){

			e.stopPropagation();

			var data = self.meta.dataTransfer;
			if( _.isFunction(data) ){
				data = data();
			}
			e.dataTransfer.setData('text/plain', JSON.stringify({
				path : self.getPath(),
				owner : self.owner,
				data : self.meta.dataTransfer
			}))
		}, false);

		$el.click(function(e){
			e.stopPropagation();
			if( ! e.shiftKey){
				self.getRoot().traverse(function(node){
					node.unselect();
				})
			}
			self.select();
		})

		return $el;
	}
	File.prototype.select = function(){
		this.$el.addClass('active');

		this.getRoot().trigger('selected:node', this);
	}
	File.prototype.unselect = function(){
		if( this.$el.hasClass('active') ){
			this.$el.removeClass('active');
			this.getRoot().trigger('unselected:node', this);
		}
	}
	File.prototype.getPath = function(){
		if( ! this.parent ){
			return this.name;
		}
		return this.parent.getPath() + this.name;
	}
	File.prototype.setName = function(name, silent){
		
		this.name = name;

		if( this.$el ){
			this.$el.children('.lblend-tree-title').html( name );
		}
		if( ! silent){
			this.getRoot().trigger('updated:name', this, name);
		}
	}

	var Folder = function(name){

		this.name = name;
		this.type = 'folder';

		this.owner = '';	//distinguish different trees

		this.meta = {};	//meta data


		this.children = [];

		this.$el = null;
		this.$sub = null;
	}

	_.extend(Folder.prototype, Backbone.Events);

	Folder.prototype.setName = function(name, silent){

		this.name = name;
		if( this.$el ){
			this.$el.children('.lblend-tree-title').html( name );
		}
		if( ! silent){
			this.getRoot().trigger('updated:name', this, name);
		}
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
			var parentPrev = node.parent;

			if(node.parent == this){
				return;
			}
			node.parent.remove(node, true);
		}
		this.children.push( node );

		node.parent = this;
		// add element
		this.$sub.append( node.genElement() );

		node.owner = this.owner;

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
		// because we still need to get node path in the event handler
		if( ! this.silent){

			this.getRoot().trigger('removed:node', this, node);
		}

		node.parent = null;
		_.without( this.children, node);
		// remove element
		node.$el.remove();

	}
	Folder.prototype.getPath = function(){
		if( ! this.parent ){
			return this.name + '/';
		}
		return this.parent.getPath() + this.name + '/';
	}
	Folder.prototype.genElement = function(){

		var html = _.template('<li class="lblend-tree-folder">\
						<span class="lblend-tree-title" draggable="true">\
							<span class="icon-small icon-unfold button-toggle-collapse"></span>\
							<span class="{{icon}}"></span>\
							{{name}}\
						</span>\
						<ul>\
						</ul>\
					</li>', {
						icon : this.icon,
						name : this.name
					})

		var $el = $(html),
			$ul = $el.children('ul');

		var self = this;
		_.each(this.children, function(child){
			$ul.append( child.genElement() );
		})

		// draggable
		$el[0].addEventListener('dragstart', function(e){

			e.stopPropagation();

			var data = self.meta.dataTransfer;
			if( _.isFunction(data) ){
				data = data();
			}
			e.dataTransfer.setData('text/plain', JSON.stringify({
				path : self.getPath(),
				owner : self.owner,
				data : self.meta.dataTransfer
			}))
		}, false)

		$el.click(function(e){
			e.stopPropagation();
			if( ! e.shiftKey){
				self.getRoot().traverse(function(node){
					node.unselect();
				})
			}
			self.select();
			self.toggleCollapase();
		})

		this.$el = $el;
		this.$sub = $ul;

		// folder and file drag in the same tree
		self.accept(function(json, e){
			if( ! ( json instanceof FileList) ){ // not from native file
				if(json.owner == self.owner){ // from the same tree
					var node = self.getRoot().find(json.path);

					if( node){
						if( node.parent != self ){
							self.add(node);
						}
					}
				}
			}
		})

		return $el;
	}

	//===============
	// data acceptable, need to move to root
	//===============
	Folder.prototype.accept = function(drop, dragenter, dragleave){
		// todo dragover有闪烁，移到某些地方会触发dragleave 待解决
		// dragover的时候能不能getDataTransfer ?
		this.$el[0].addEventListener('dragover', function(e){
			e.stopPropagation();
			e.preventDefault();

			$(this).addClass('lblend-tree-dragover');

			dragenter && dragenter(e);
		});
		this.$el[0].addEventListener('dragleave', function(e){
			e.stopPropagation();
			e.preventDefault();

			$(this).removeClass('lblend-tree-dragover');

			dragleave && dragleave(e);

		});
		this.$el[0].addEventListener('drop', function(e){
			e.stopPropagation();
			e.preventDefault();
			$(this).removeClass('lblend-tree-dragover');

			var data;
			if(e.dataTransfer.files.length){
				// data from native files
				data = e.dataTransfer.files;
			}else{
				data = JSON.parse(e.dataTransfer.getData('text/plain'));
			}

			drop && drop(data, e);
		}, false );
	}

	Folder.prototype.reject = function(callback){
		this.$el[0].removeEventListener('drop', callback);
	}

	Folder.prototype.select = function(){
		this.$el.addClass('active');
		this.selected = true;
		this.getRoot().trigger('selected:node', this);
	}

	Folder.prototype.unselect = function(){
		if( this.$el.hasClass('active') ){
			this.$el.removeClass('active');
			this.selected = false;
			this.getRoot().trigger('unselected:node', this);
		}
	}

	Folder.prototype.toggleCollapase = function(){
		this.$el.toggleClass('collapse');
		var $btn = this.$el.find('.button-toggle-collapse');
		if(this.$el.hasClass('collapse')){
			$btn.removeClass('icon-unfold');
			$btn.addClass('icon-fold');
		}else{
			$btn.removeClass('icon-fold');
			$btn.addClass('icon-unfold');
		}
	}

	Folder.prototype.traverse = function(callback){
		callback( this );
		_.each( this.children, function(child){
			if( ! child.traverse){	// is a file
				callback( child );
			}else{
				child.traverse( callback );
			}
		} )
	}

	// find a folder or file 
	Folder.prototype.find = function(path){

		var root = this;
		// abosolute path
		if( path.charAt(0) == '/'){
			path = path.substring(1);
			root = this.getRoot();
		}
		
		return _.reduce(_.compact(path.split('/')), function(node, name){
			if( ! node){
				return;
			}
			if( name == '..'){
				return node.parent;
			}
			else if( !name || name =='.'){
				return node;	
			}
			else{
				return _.find(node.children, function(item){
					return item.name==name
				});
			}
		}, root);
	}

	Folder.prototype.createFromJSON = function(json){
		
		var self = this;

		json = _.isArray(json) ? json : [json];

		_.each(json, function(item){

			if( item.type == 'folder'){

				var folder = new Folder(item.name);

				folder.meta = item;
				folder.icon = item.icon;

				self.add(folder);

				_.each(item.children, function(child){

					folder.createFromJSON(child);
				})
			}
			else if( item.type == 'file' ){

				var file = new File(item.name);
				file.meta = item;
				file.icon = item.icon;

				self.add(file);
			}
		})
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
	Folder.prototype.createFile = function(path, silent){
		dir = _.compact(path.split('/'));
		var fileName = dir.pop();
		var folder = this.createFolder(dir.join('/'));
		var file = folder.find(fileName);
		if( ! file){
			file = new File( fileName );
			folder.add( file, silent );

			if( ! silent){
				this.getRoot().trigger('created:file', this, file);
			}
		}

		return file;
	}

	var Root = function(){
		Folder.call(this);
		this.name = '/';
	};
	Root.prototype = new Folder;
	Root.prototype.getPath = function(){
		return '/';
	}
	Root.prototype.genElement = function(){

		var $el = $('<div class="lblend-tree-root">\
						<ul></ul>\
					</div>');
		var $ul = $el.find('ul');
		this.$sub = $ul;
		this.$el = $el;
		
		_.each(this.children, function(child){
			$ul.append( child.genElement() );
		})

		return $el;
	}

	var View = Backbone.View.extend({

		className : 'lblend-tree',

		tagName : 'div',

		root : null,

		initialize : function(){
			if( ! this.model ){
				this.model = new Model;
			};
			if( ! this.root ){
				this.root = new Root;
			}
			this.model.on('change:json', function(){
				this.render();
			}, this);
			this.root.on('all', function(){
				this.trigger.apply(this, arguments);
			}, this);

			this.render();
		},

		render : function(){

			this.root.createFromJSON( this.model.get('json') );

			this.$el.html('');
			this.$el.append( this.root.genElement() );

		},

		find : function(path){
			return this.root.find(path);
		},

		remove : function(path){
			var node = this.find(path);
			if(node){
				node.parent.remove(node);
			}
		},

		select : function(path, multiple){
			if( ! multiple){
				this.root.traverse(function(node){
					node.unselect();
				})
			}
			this.root.find(path).select();
		}
	})


	Model.prototype.__viewconstructor__ = View;

	exports.Model = Model;

	exports.View = View;

	exports.File = File;

	exports.Folder = Folder;

	exports.Root = Root;
})
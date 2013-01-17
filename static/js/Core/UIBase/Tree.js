//=====================
// Tree.js
// tree view
//=====================
define(function(require, exports, module){


	var treeInstances = [];
	// data structure
	// + type : 		file|folder
	// + name : ""
	// + icon : "" 		icon class
	// + owner			distinguish different trees
	// + children : []	if type is folder
	// + dataSource 	asset path or scene node json data
	// + dataType 		type of binded asset or node
	//
	// dataSource and dataType is maily for the dataTransfer
	var Model = Backbone.Model.extend({
		defaults : {
			json : []
		}
	});

	var File = function(name){

		this.type = 'file';
		this.name = name;
		this.owner = "";

		this.acceptConfig = {};

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
							<span class="lblend-tree-icon"></span>\
							<a>{{name}}</a>\
						</span>\
					</li>', {
						name : this.name
					})
		var $el = $(html);
		if(_.isString(this.icon)){
			$el.find('.lblend-tree-icon').addClass(this.icon);
		}else{
			// an image or something else
			$el.find('.lblend-tree-icon').append(this.icon);
		}

		this.$el = $el;

		$el.data('path', this.getPath() );

		var self = this;

		// draggable
		$el[0].addEventListener('dragstart', function(e){

			e.stopPropagation();

			e.dataTransfer.setData('text/plain', JSON.stringify(self.toJSON()) )
		}, false)

		return $el;
	}
	File.prototype.select = function(silent){
		this.$el.addClass('active');

		if( ! silent){
			this.getRoot().trigger('selected:node', this);
		}
		
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
		
		if( ! silent){
			this.getRoot().trigger('updated:name', this, name);
		}

		this.name = name;

		if( this.$el ){
			this.$el.children('.lblend-tree-title').find('a').html( name );
		}
		//update data
		this.$el.data('path', this.getPath());

	}
	File.prototype.toJSON = function(){
		var item = {
			type : this.type,
			name : this.name,
			path : this.getPath(),
			// icon : this.icon,
			owner : this.owner,
			dataSource : _.isFunction(this.dataSource) ? this.dataSource() : this.dataSource,
			dataType : this.dataType
		}

		return item;
	}

	var Folder = function(name){

		this.name = name;
		this.type = 'folder';

		this.owner = '';	//distinguish different trees

		this.children = [];

		this.$el = null;
		this.$sub = null;

		// config to verify if this folder can accept
		// any transferred data
		this.acceptConfig = {
			'default' : {
				// an verify function
				accept : function(json){
					if( ! (json instanceof FileList) ){
						if( json.owner == this.owner ){
							return true;
						}
					}
				},
				// action after verify succeed
				accepted : function(json){
					// default action after target is dropped and accepted
					// move an other node to the folder
					var node = this.getRoot().find(json.path);

					if( node){
						if( node.parent != self ){
							this.add(node);
						}
					}
				}

			}
		}
	}

	_.extend(Folder.prototype, Backbone.Events);

	Folder.prototype.setName = function(name, silent){

		if( ! silent){
			this.getRoot().trigger('updated:name', this, name);
		}

		this.name = name;
		if( this.$el ){
			this.$el.children('.lblend-tree-title').find('a').html( name );
		}

		//update data
		this.$el.data('path', this.getPath());
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
							<span class="lblend-tree-icon"></span>\
							<a>{{name}}</a>\
						</span>\
						<ul>\
						</ul>\
					</li>', {
						name : this.name
					})

		var $el = $(html),
			$ul = $el.children('ul');

		if(_.isString(this.icon)){
			$el.find('.lblend-tree-icon').addClass(this.icon);
		}else{
			// an image or something else
			$el.find('.lblend-tree-icon').append(this.icon);
		}

		$el.data('path', this.getPath());

		var self = this;
		_.each(this.children, function(child){
			$ul.append( child.genElement() );
		})

		// draggable
		$el[0].addEventListener('dragstart', function(e){

			e.stopPropagation();

			e.dataTransfer.setData('text/plain', JSON.stringify(self.toJSON()) )
		}, false)

		this.$el = $el;
		this.$sub = $ul;

		return $el;
	}

	// default accept judgement

	Folder.prototype.accept = function(accept, accepted){
		this.acceptConfig.push({
			accept : accepted
		})
	}

	Folder.prototype.select = function(silent){
		this.$el.addClass('active');
		this.selected = true;

		if( ! silent){
			this.getRoot().trigger('selected:node', this);
		}
		
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
	}

	Folder.prototype.uncollapase = function(){
		this.$el.removeClass('collapse');
	}

	Folder.prototype.collapase = function(){
		this.$el.addClass('collapse');
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
		if( ! path){
			return;
		}
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

				folder.icon = item.icon;
				folder.dataSource = item.dataSource;
				folder.dataType = item.dataType;

				self.add(folder);

				_.each(item.children, function(child){

					folder.createFromJSON(child);
				})
			}
			else if( item.type == 'file' ){

				var file = new File(item.name);

				file.icon = item.icon;
				file.source = item.source;
				file.targetType = item.targetType;

				self.add(file);
			}
		})
	}

	Folder.prototype.toJSON = function(){
		var item = {
			type : this.type,
			name : this.name,
			path : this.getPath(),
			// icon : this.icon,
			owner : this.owner,
			dataSource : _.isFunction(this.dataSource) ? this.dataSource() : this.dataSource,
			dataType : this.dataType,
			children : []
		}

		_.each(this.children, function(child){
			item.children.push( child.toJSON() );
		})
		return item;
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

		type : 'THREE',

		className : 'lblend-tree',

		tagName : 'div',

		root : null,

		events : {
			'dragenter li' : 'dragenterHandler',
			'dragleave li' : 'dragleaveHandler',
			'drop li' : 'dropHandler',
			'click .lblend-tree-title' : 'clickTitleHanlder'
		},

		initialize : function(){
			var self =this;

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

			this._dragenter = [];
			this._dragleave = [];
			this._drop = [];
			// folder and file drag in the same tree
			this.drop(function(json, e){
				
				var node = self.find($(this).data('path'));
				
				_.each(node.acceptConfig, function(config){
					if( config.accept.call(node, json) ){
						config.accepted.call(node, json);
					}
				})
			})

			// !! if the treeview is not used anymore 
			// must trigger disposed event manually
			treeInstances.push(this);
			this.on('disposed', function(){
				_.without(treeInstances, self);
			})
		},

		render : function(){

			this.root.createFromJSON( this.model.get('json') );

			this.$el.html('');
			this.$el.append( this.root.genElement() );

		},

		clickTitleHanlder : function(e){
			var $li = $(e.currentTarget).parent();
			var path = $li.data('path');
			var node = this.find(path);
			node.select();

			if( ! e.shiftKey){
				this.root.traverse(function(_node){
					_node.unselect();
				})
			}
			node.select();
			if(node.type == 'folder'){

				node.toggleCollapase();
			}
			// node click event
			this.trigger('click:node', node);
		},

		find : function(path){
			return this.root.find(path);
		},

		remove : function(path, silent){
			var node = this.find(path);
			if(node){
				node.parent.remove(node, silent);
			}
		},

		select : function(path, multiple, silent){
			if( ! multiple){
				this.root.traverse(function(node){
					node.unselect();
				})
			}
			this.root.find(path).select(silent);
		},

		getSelected : function(){
			var selected = [];
			this.root.traverse(function(node){
				if(node.selected){
					selected.push(node);
				}
			})
			return selected;
		},

		_dragenter : [],

		_dragleave : [],

		_drop : [],

		dragenterHandler : function(e){
			e.stopPropagation();
			e.preventDefault();

			$(e.currentTarget).addClass('lblend-tree-dragover');

			_.each(this._dragenter, function(func){
				func.call(e.currentTarget, e);
			})
		},

		dragleaveHandler : function(e){
			e.stopPropagation();
			e.preventDefault();

			$(e.currentTarget).removeClass('lblend-tree-dragover');

			var self = this;
			_.each(this._dragleave, function(func){
				func.call(e.currentTarget, e);
			})
		},

		dropHandler : function(e){
			e.stopPropagation();
			e.preventDefault();

			$(e.currentTarget).removeClass('lblend-tree-dragover');

			var data;
			if(e.dataTransfer.files.length){
				// data from native files
				data = e.dataTransfer.files;
			}else{
				data = JSON.parse(e.dataTransfer.getData('text/plain'));
			}
			_.each(this._drop, function(func){
				func.call(e.currentTarget, data, e);
			})
		},

		drop : function(drop, dragenter, dragleave){
			
			if( drop ){
				this._drop.push(drop);
			}
			if( dragenter ){
				this._dragenter.push(dragenter);
			}
			if( dragleave ){
				this._dragleave.push(dragleave);
			}
		}

	})


	Model.prototype.__viewconstructor__ = View;

	exports.Model = Model;

	exports.View = View;

	exports.File = File;

	exports.Folder = Folder;

	exports.Root = Root;
})
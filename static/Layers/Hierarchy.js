//==========================
// Hierarchy.js
// 场景对象层级
//==========================
define(function(require, exports, module){
	
	var UI = require('../UI/index');
	UI.Mixin = require('../UI/Mixin/index');
	var hub = require('./Hub').getInstance();
	var project = require('./Project').getInstance();

	var view;

	function getInstance(){
		if(view){
			return {
				view : view
			}
		}

		view = new UI.Panel.View;
		view.setName('Hierarchy');
		view.$el.attr('id', 'Hierarchy');

		UI.Mixin.Scrollable.applyTo( view );

		handleHubEvent();

		handleDropEvent();	

		return {
			view : view
		}
	}

	function handleDropEvent(){
		// todo 可以拖拽到节点上
		view.$el[0].addEventListener('drop', function(e){
			
			e.stopPropagation();

			var json = e.dataTransfer.getData('text/plain');
			if( json ){

				var node = project.receiveDataTransfer( json , ['mesh', 'geometry']);
				hub.trigger('add:node', node);
			}
			
		})
	}

	function handleHubEvent(){
		hub.on('initialized:app', function(scene){
			updateSceneThree();
		})
		// update scene
		hub.on('added:node', function(node){
			var parentName = node.parent.name;
			var $parent = view.$list.find('li[target-node='+parentName+']');
			var $ul = $parent.children('ul');
			if( ! $ul.length){
				$ul = $('<ul></ul>')
				$parent.append($ul);
			}
			createNode([node], $ul);
		})
		// select object
		hub.on('selected:node', function(node){
			var $threeView  = view.$list.find('.threeview');
			$threeView.find('li').removeClass('active');
			if( ! node){
				selectItem(null);
				return;
			}
			var name = node.name;

			var $li = $threeView.find('li[target-node='+name+']');
			selectItem($li);
		})
		hub.on('removed:node', function(node){
			var $threeView  = view.$list.find('.threeview');
			var name = node.name;
			var $li = $threeView.find('li[target-node='+name+']');
			// 选择最近的li
			var toBeSelected = $li.prev().attr('target-node');
			if( ! toBeSelected){
				toBeSelected = $li.parent().parent().attr('target-node');
			}
			// 移除
			$li.remove();
			hub.trigger('select:node', toBeSelected);
		})
	}

	function selectItem($li){
		var $hoverbar = view.$list.find('.hoverbar')
		if( ! $li || ! $li.length){
			$hoverbar.css({
				display:'none'
			})
			return;
		}
		$li.addClass('active');
		//unfold parent;
		var $parents = $li.parents('.hierarchy-node');
		$parents.removeClass('fold');
		$parents.addClass('unfold');

		var liPos = {
			top : $li.offset().top-view.$list.offset().top
		};
		$hoverbar.css({
			display:'block'
		})
		$hoverbar.css(liPos);
	}

	function updateSceneThree(){
		view.$list.html('');
		var scene = require('./Scene').getInstance();
		var $sceneTree = createSceneTree(scene.scene);
		view.$list.append($sceneTree);
		var $hoverbar = $('<div class="hoverbar"><div>');
		view.$list.append($hoverbar);
	}

	function createNode(children, $container){

		_.each(children, function(item){
			// 不显示辅助显示的物体
			if(item.__helper__){
				return;
			}
			// target-node属性是为了查询方便点
			var $li = $('<li target-node="'+item.name+'" class="unfold hierarchy-node"></li>');
			var $title = $('<div class="title"><a>'+item.name+'</a></div>');
			$li.append($title);
			$container.append($li);
			// collasable button
			var $collasable = $('<span class="collasable"></span>');
			$title.prepend($collasable);
			$collasable.click(function(){
				if($li.hasClass('unfold')){
					$li.removeClass('unfold');
					$li.addClass('fold');
				}else{
					$li.removeClass('fold');
					$li.addClass('unfold');
				}
			})
			// 递归添加
			if(item.children.length){
				$ul = $('<ul></ul>');
				$li.append($ul);
				createNode(item.children, $ul);
			}
			// 点击选择事件
			$li.click(function(e){
				e.stopPropagation();
				hub.trigger('select:node', item.name);
			})
		})
	}

	function createSceneTree(root){

		var $root = $('<ul class="threeview"></ul>');
		// 两级菜单
		
		createNode([root], $root);

		return $root;
	}

	return {
		getInstance : getInstance
	}
})
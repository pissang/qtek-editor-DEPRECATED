//================================
// Menu.js
// 菜单层
//================================
define(function(require, exports, module){

	var Panel = require('../Core/UIBase/Panel');
	var hub = require('../Core/Hub').getInstance();

	var view;

	function getInstance(){
		if(view){
			return {
				view : view
			}
		}

		var view = new Panel.View;
		var $menu = createMenu();
		view.$list.append($menu);
		view.$el.attr('id', 'Menu');

		$menu.children('li').each(function(index){
			$(this).css({
				'border-bottom' : '1px solid '+colors[index]
			})
		})

		$(document.body).click(function(){
			$menu.find('li').removeClass('active');
		})

		return {
			view : view
		}
	}

	var colors = ['#E68D35', '#09AA64', '#068894', '#ebaf3c','#3c78eb'];

	function createMenu(){
		var $menu = $('<ul class="menu"></ul>');

		// 两级菜单
		function walk(list, $container){
			
			_.each(list, function(item, title){

				var $li = $('<li></li>');
				var $a = $('<a>'+title+'</a>');
				$li.append($a);
				$container.append($li);
				if(_.isObject(item)){
					
					$a.append('<span class="icon-small icon-menu-parent"></span>');

					$ul = $('<ul></ul>');
					$li.append($ul);

					// show sub menu
					$li.click(function(e){
						e.stopPropagation();
						$(this).parent().find('li').removeClass('active');
						$(this).addClass('active');
					})

					// 递归添加
					walk(item, $ul);
				}
				else if(_.isString(item)){
					$li.click(function(){
						// 触发事件
						params = item.split(',');
						hub.trigger.apply(hub, params);
					})
				}
			})
		}
		walk(menuConfig, $menu);

		return $menu;
	}

	var menuConfig = {
		'File' : {
			'load' : 'load:project',
			'save' : 'save:project',
			'export project' : 'export:project',
			'export scene' : 'export:scene',
		},
		'Edit' : {},
		'Object' : {
			'Empty' : 'create:empty',
			'Mesh' : {
				'Cube' : 'create:mesh,cube',
				'Sphere' : 'create:mesh,sphere',
				'Plane' : 'create:mesh,plane',
				'Cylinder' : 'create:mesh,cylinder'
			},
			'Light' : {
				// 逗号分隔参数
				'Ambient' : 'create:light,ambient',
				'Directional' : 'create:light,directional',
				'Point' : 'create:light,point',
				'Spot' : 'create:light,spot'
			},
			'Camera' : {
				'Perspective' : 'create:camera,perspective',
				'Ortho' : 'create:camera,ortho'
			}
		},
		'Nodes' : {
			'Inputs' : {
				'Timer' : 'create:node,timer',
				'Scene' : 'create:node,scene'
			},
			'Viewer' : 'create:node,viewer'
		},
		'Help' : {}
	}

	return  {
		getInstance : getInstance
	}
})
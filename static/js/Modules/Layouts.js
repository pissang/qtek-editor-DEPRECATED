
define(function(require, exports, module){

	var Scene = require('./Scene');

	var layouts = [
		{
			template : '<div class="workspace-scene ui-layout-container">\
							<div class="ui-layout-center">\
								<div class="region" tabindex="1" data-modules="Scene Compositor"></div>\
							</div>\
							<div class="ui-layout-east">\
								<div class="region" tabindex="2" data-modules="Inspector"></div>\
							</div>\
							<div class="ui-layout-west">\
								<div class="ui-layout-container">\
									<div class="ui-layout-north">\
										<div class="region" tabindex="3" data-modules="Hierarchy"></div>\
									</div>\
									<div class="ui-layout-center">\
										<div class="region" tabindex="4" data-modules="Project"></div>\
									</div>\
								</div>\
							</div>\
							<div class="ui-layout-north">\
								<div class="region" data-modules="Menu"></div>\
							</div>\
						<div class="copyright">\
							copyright 2012 Shen Yi\
						</div>',

			init : function(container){
				var $el = $(this.template);
				$(container).append($el);

				$el.layout({
					north__size : 25,
					east__minSize : 330,
					north__resizable : false,
					onresize_end : function(){
						Scene.getInstance().resize();
					}
				});

				$sidebar = $el.find('.ui-layout-container');
				$sidebar.layout({
					north__size : $sidebar.height()/2
				})

				return $el;
			}
		}
	]

	return layouts;
})
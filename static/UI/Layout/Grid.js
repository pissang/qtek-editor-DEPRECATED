//===========================
// Grid.js
// Grid布局
// 使用jquery resizable
// 弃用弃用
//===========================

define(['../Layer'], function(require, exports){

	var Layer = require('../Layer');

	var Region = Backbone.Model.extend({

		initialize : function(){
			// outerWidth和outerHeight是jquery 1.8里面才加上的，但是有border的时候还是有问题
			// fucccccckkkkkkkk
			this.on('change:width', function(){
				var $el = this.get('$el');
				$el.outerWidth(this.get('width') );
			}, this)
			this.on('change:height', function(){
				var $el = this.get('$el');
				$el.outerHeight(this.get('height') );
			}, this)
			this.on('change:$el', function(){
				var $el = this.get('$el');
				$el.outerWidth(this.get('width'));
				$el.outerHeight(this.get('height') );
			}, this);
		},

		defaults : {
			width : 0,
			height : 0,
			row : 0,
			column : 0,
			$el : null
		}
	});

	var Column = Backbone.Collection.extend({

		model : Region,

		setWidth : function(width){

			this.forEach(function(region){

				region.set('width', width, {
					
					onlyUpdate : true
				})
			})
		},

		getRegion : function(index){
			
			return this.where({
				row : index
			})[0]
		}
	});

	var Row = Backbone.Collection.extend({
		
		model : Region,

		setHeight : function(height){

			this.forEach(function(region){

				region.set('height', height, {
					
					onlyUpdate : true
				})
			})
		},

		getRegion : function(index){
			
			return this.where({
				column : index
			})[0]
		}
	})

	var Regions = Backbone.Collection.extend({

		model : Region,

		initialize : function(){

			this._rowNumber = this.getRowNumber(false);
			this._columnNumber = this.getColumnNumber(false);
			var self = this;
			this.on('add', function(region){
				if(region.get('row') > self._rowNumber){
					self._rowNumber = region.get('row');
				}
				if(region.get('column') > self._columnNumber){
					self._columnNumber = region.get('column');
				}
			});
			this.on('remove', function(region){
				if(region.get('row') = self._rowNumber){
					self._rowNumber = self.getRowNumber(false);
				}
				if(region.get('column') = self._columnNumber){
					self._columnNumber = this.getColumnNumber(false);
				}
			})
		},

		getRow : function(index){

			var row = new Row;
			_.each(this.where({row : index}), function(region){
				row.push(region);
			});

			return row;
		},

		getColumn : function(index){

			var col = new Column;
			_.each(this.where({column : index}), function(region){
				col.push(region);
			});

			return col;
		},
		// 获取最大的row的index
		getRowNumber : function(useCache){
			
			useCache = _.isUndefined(useCache) ? true : useCache;

			if(useCache){
				return this._rowNumber;
			}

			var max = this.max(function(region){
				return region.get('row');
			});
			if(max){
				return max.get('row')
			}else{
				return 0;
			}
		},
		// 获取最大的column的index
		getColumnNumber : function(useCache){

			useCache = _.isUndefined(useCache) ? true : useCache;

			if(useCache){
				return this._columnNumber;
			}
			
			var max = this.max(function(region){
				return region.get('column');
			});
			if(max){
				return max.get('column');
			}else{
				return 0;
			}
		},

		getRegion : function(row, column){
			return this.where({
				row : row,
				column : column
			})[0]
		},

		getSub : function(startRow, startColumn, endRow, endColumn){
			var subRegions = new Regions;
			var self = this;
			_.each(self.filter(function(region){
				return region.get('row') >= startRow &&
						region.get('column') >= startColumn &&
						region.get('row') <= endRow &&
						region.get('column') <= endColumn;
			}), function(region){

				subRegions.push(region);
			});

			return subRegions;
		},

		getWidth : function(){
			var width = 0;
			this.getRow(0).forEach(function(region){
				width += region.get('width');
			})
			return width;
		},
		getHeight : function(){
			var height = 0;
			this.getColumn(0).forEach(function(region){
				height += region.get('height');
			});
			return height;
		},
		setWidth : function(width){
			var dWidth = width - this.getWidth();
			var number = this.getColumnNumber();
			this.forEach(function(region){
				var w = region.get('width');
				w += dWidth/number;
				region.set('width', w, {
					
					onlyUpdate : true
				});
			});
		},
		setHeight : function(height){
			var dHeight = height - this.getHeight();
			var number = this.getRowNumber();
			this.forEach(function(region){
				var h = region.get('height');
				h += dHeight/number;
				region.set('height', h, {
					
					onlyUpdate : true
				});
			})
		}
	})

	var Layout = function(row, column, $container){

		var row = row || 1;
		
		var column = column || 1;

		var width = $container ? $container.width() : 0,
			height = $container ? $container.height() : 0;
		
		this.regions = new Regions;

		for(var i = 0; i < row; i ++){

			for(var j = 0; j < column; j++){

				this.regions.add({
					row : i,
					column : j,
					width : width/column,
					height : height/row
				})

			}
		}

		var self = this;
		
		this.regions.on('change:width', function(region, width, options){
				// onlyUpdate是set的时候自己传的参数，防止这个函数被调用很多次出现各种诡异的问题
				if(options.onlyUpdate){
					return;
				}
				// 更新当前列的宽度
				var columnIndex = region.get('column');
				var column = self.regions.getColumn(columnIndex);
				column.setWidth( width );

				var subRegion = self.regions.getSub(0, columnIndex+1, self.regions.getRowNumber(), self.regions.getColumnNumber());

				var dWidth = width - region.previous('width');
				subRegion.setWidth(subRegion.getWidth() - dWidth);
			})

		this.regions.on('change:height', function(region, height, options){
				if(options.onlyUpdate){
					return;
				}
				var rowIndex = region.get('row');
				var row = self.regions.getRow(rowIndex);
				row.setHeight( height);

				var subRegion = self.regions.getSub(rowIndex+1, 0, self.regions.getRowNumber(), self.regions.getColumnNumber());

				var dHeight = height - region.previous('height');
				subRegion.setHeight(subRegion.getHeight() - dHeight);
			})

	}

	Layout.prototype.fill = function(row, column, $el){
		this.regions.getRegion(row, column).set({
			'$el' : $el
		});
		$el.css({
			'display' : 'inline-block'
		})
	}

	Layout.prototype.get = function(row, column){
		return this.regions.getRegion(row, column);
	}

	return Layout;
})
/**
 * GooJS
 * 
 * @author shenyi01@baidu.com
 *
 * TODO: 渐变样式
 * 		MASK
 */
var GooJS = {};
var Goo = Goo || GooJS;
var GOO = GOO || GooJS;
var G = G || GooJS;

GooJS.create = function(dom){
		//所有会被渲染的元素
	var renderPool = {},
		//被渲染的canvas对象
		container = null,
		//canvas的上下文
		context = null,
		//canvas宽度
		clientWidth = 0,
		//canvas高度
		clientHeight = 0,
		//
		ghostCanvas = null,
		//
		ghostCanvasContext = null,

		elementLookupTable = [],

		ghostImageData;

	function addElement(elem){
		renderPool[elem.__GUID__] = elem;
	}
	/**
	 * @param elem element id || element
	 */
	function removeElement(elem){
		if(typeof(elem) == 'string'){
			elem = elementsMap[elem];
		}
		
		delete renderPool[elem.__GUID__];
	}
	
	function render(){
		//清空
		context.clearRect(0, 0, clientWidth, clientHeight);
		ghostCanvasContext.clearRect(0, 0, clientWidth, clientHeight);
		//清空lookupTable
		elementLookupTable = [];

		var renderQueue = getSortedRenderQueue(renderPool);		

		for(var i =0; i < renderQueue.length; i++){
			var r = renderQueue[i];
			
			draw(r);

			drawGhost(r)
		}
		////////get image data
		ghostImageData = ghostCanvasContext.getImageData(0, 0, ghostCanvas.width, ghostCanvas.height);

		function draw(r){
			
			if( ! r.visible){
				return ;
			}

			context.save();
			
			if(r.style){

				if( ! r.style instanceof GooJS.Style){

					for(var name in r.style){
						
						r.style[i].bind(context);
 					}
				}else{

					r.style.bind(context);
				}
			}
			r._transform && context.transform(r._transform[0],
											r._transform[1],
											r._transform[2],
											r._transform[3],
											r._transform[4],
											r._transform[5]);
			
			r.draw(context);
			//draw its children
			var renderQueue = getSortedRenderQueue(r.children);
			for(var i = 0; i < renderQueue.length; i++){
				draw(renderQueue[i]);
			}

			context.restore();
		}

		function drawGhost(r){
			if( ! r.visible){
				return;
			}

			elementLookupTable.push(r);

			ghostCanvasContext.save();

			var rgb = packID(elementLookupTable.length),
				color = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';

			ghostCanvasContext.fillStyle = color;
			ghostCanvasContext.strokeStyle = color;

			if(r.intersectLineWidth){
				ghostCanvasContext.lineWidth = r.intersectLineWidth;
			}
			else if(r.style.lineWidth){
				ghostCanvasContext.lineWidth = r.style.lineWidth;
			}

			if(r instanceof GooJS.Text){

			}
			else if(r instanceof GooJS.Image){

			}
			else{

				r.draw(ghostCanvasContext);
			}

			ghostCanvasContext.restore();
		}

		function getSortedRenderQueue(pool){
			var renderQueue = [];

			for (var guid in pool) {
			
				renderQueue.push(pool[guid]);
			};

			//z值从小到大排, 相同按照GUID的顺序
			renderQueue.sort(function(x, y){
				if(x.z == y.z)
					return x.__GUID__ > y.__GUID__ ? 1 : -1;
				
				return x.z > y.z ? 1 : -1;
			})
			return renderQueue;
		}
	}

	function getMousePosition(e){
		var offsetX = e.pageX - this.offsetLeft,
			offsetY = e.pageY - this.offsetTop,
			p = this,
			newEvent = {};
			
		while(p = p.offsetParent){
			offsetX -= p.offsetLeft;
			offsetY -= p.offsetTop;
		}
		return {
			x : offsetX,
			y : offsetY,
			pageX : e.pageX,
			pageY : e.pageY
		}
	}
	
	function clickHandler(e){
		
		findTrigger.call(this, e, 'click');
	}
	
	function mouseDownHandler(e){
		
		findTrigger.call(this, e, 'mousedown');
	}
	
	function mouseUpHandler(e){

		var newEvent = getMousePosition.call(this, e);

		for(var i = 0; i < elementLookupTable.length; i++){
			
			var elem = elementLookupTable[i];
			if(elem['onmouseup']){
				
				elem['onmouseup'].call(elem, newEvent);

			}
		}

	}
	
	function mouseMoveHandler(e){
		

		var newEvent = getMousePosition.call(this, e);

		for(var i = 0; i < elementLookupTable.length; i++){
			
			var elem = elementLookupTable[i];
			if(elem['onmousemove']){
				
				elem['onmousemove'].call(elem, newEvent);
			}
		}

		var trigger = findTrigger.call(this, e, 'mouseover');
		trigger && (trigger.__mouseover__ = true);
	}
	
	function mouseOutHandler(e){
		
		for(var i = 0; i < elementLookupTable.length; i++){

			var elem = elementLookupTable[i];
			if(elem.__mouseover__){
				elem['onmouseout'] && elem['onmouseout'].call(elem, {x:0, y:0});
				elem.__mouseover__ = false;
			}
		}
	}

	function packID(id){
		var r = id >> 16,
			g = (id - (r << 8)) >> 8,
			b = id - (r << 16) - (g<<8);
		return {
			r : r,
			g : g,
			b : b
		}
	}

	function unpackID(r, g, b){
		return (r << 16) + (g<<8) + b;
	}
	/**
	 * 查询被点击的元素
	 */
	function findTrigger(e, type){

		var newEvent = getMousePosition.call(this, e),
			x = newEvent.x,
			y = newEvent.y,
			trigger = null;

		var cursor = ((y-1) * ghostCanvas.width + x-1)*4,
			r = ghostImageData.data[cursor],
			g = ghostImageData.data[cursor+1],
			b = ghostImageData.data[cursor+2],
			a = ghostImageData.data[cursor+3],
			id = unpackID(r, g, b);

		if( id && ( a == 255 || a == 0)){
			trigger = elementLookupTable[id-1];

			if(type == 'mouseover' && trigger.__mouseover__){
				//只执行一次mouseover事件
				return null;
			}
			if(trigger['on'+type]){

				trigger['on'+type].call(trigger, newEvent);
			}
		}
		for(var i = 0; i < elementLookupTable.length; i++){
			var elem = elementLookupTable[i];

			if(elem.__mouseover__ && elem != trigger){
				elem['onmouseout'] && elem['onmouseout'].call(elem, newEvent);
				elem.__mouseover__ = false;
			}
		}
		return trigger;
	}
	
	function initContext(dom){
		if(typeof(dom) == "string"){
			dom = document.getElementById(dom);
		}
		container = dom;
		dom.addEventListener('click', clickHandler);
		dom.addEventListener('mousedown', mouseDownHandler);
		dom.addEventListener('mouseup', mouseUpHandler);
		dom.addEventListener('mousemove', mouseMoveHandler);
		dom.addEventListener('mouseout', mouseOutHandler);
		
		clientWidth = dom.width;
		clientHeight = dom.height;
		
		context = dom.getContext('2d');

		//ghost canvas for hit test
		ghostCanvas = document.createElement('canvas');
		ghostCanvas.width = clientWidth;
		ghostCanvas.height = clientHeight;
		ghostCanvasContext = ghostCanvas.getContext('2d');

	}

	function resize(width, height){
		container.width = width;
		container.height = height;

		ghostCanvas.width = width;
		ghostCanvas.height = height;

		clientWidth = width;
		clientHeight = height;
	}
	
	initContext(dom);
	
	return {
		
		'addElement' : addElement,
		
		'removeElement' : removeElement,
		
		'render' : render,
		
		'initContext' : initContext,

		'resize' : resize,

		'getContext' : function(){return context;},
		
		'getClientWidth' : function(){return clientWidth},
		
		'getClientHeight' : function(){return clientHeight},
		
		'getContainer' : function(){return container},

		'getGhostCanvas' : function(){return ghostCanvas},

		'getGhostContext' : function(){return ghostCanvasContext}
	}
}

GooJS.Util = {}

GooJS.Util.genGUID = (function(){
	var guid = 0;
	
	return function(){
		guid++;
		return guid;
	}
})()

GooJS.Util.extend = function(target, source){
	for(var key in source){
		
		target[key] = source[key];
	}
}
/*
GooJS.Util.RGB2HSV = function(r, g, b){
	var max = GooJS.Math.max([r, g, b]),
		min = GooJS.Math.min([r, g, b]),
		h, s, v;

	if( r == max){
		h = (g-b)/(max-min);
	}
	else if(g == max){
		h = 2 + (b-r)/(max-min);
	}
	else if(b == max){
		h = 4 + (r-g)/(max-min);
	}

	h = h * 60;
	if(h < 0){
		h = h + 360;
	}
}
*/
GooJS.Util.HSV2RGB = function(h, s, v){
	
	var r, g, b;

	if(h.constructor == Array ){
		s = h[1];
		v = h[2];
		h = h[0];
	}
	if(s == 0){
		r = g = b = v;
	}
	else{
		var i = Math.floor(h/60);
	}
	var f = h/60-i,
		p = v*(1-s),
		q = v*(1-s*f),
		t = v*(1-s*(1-f));

	switch(i){
		case 0:
			r = v;
			g = t;
			b = p;
			break;
		case 1:
			r = q;
			g = v;
			b = p;
			break;
		case 2:
			r = p;
			g = v;
			b = t;
			break;
		case 3:
			r = p;
			g = q;
			b = v;
			break;
		case 4:
			r = t;
			g = p;
			b = v;
			break;
		case 5:
			r = v;
			g = p;
			b = q;
			break;
	}

	return "rgb("+ parseInt(r*255)+"," + parseInt(g*255)+","+parseInt(b*255)+")";
}

GooJS.Math = {};

GooJS.Math.max = function(array){
	var max = 0;
	for(var i =0; i < array.length; i++){
		if(array[i] > max){
			max = array[i];
		}
	}
	return max;
}
GooJS.Math.min = function(array){
	var min = 9999999999;
	for(var i = 0; i < array.length; i++){
		if(array[i] < min){
			min = array[i];
		}
	}
	return min;
}
/**
 * 计算包围盒
 */
GooJS.Math.computeAABB = function(points){
	var left = points[0][0],
		right = points[0][0],
		top = points[0][1],
		bottom = points[0][1];
	
	for(var i = 1; i < points.length; i++){
		left = points[i][0] < left ? points[i][0] : left;
		right = points[i][0] > right ? points[i][0] : right;
		top = points[i][1] < top ? points[i][1] : top;
		bottom = points[i][1] > bottom ? points[i][1] : bottom;
	}
	return [[left, top], [right, bottom]];
}

GooJS.Math.intersectAABB = function(point, AABB){
	var x = point[0],
		y = point[1];
	return  (AABB[0][0] < x && x < AABB[1][0]) && (AABB[0][1] < y && y< AABB[1][1]);
}

GooJS.Math.Vector = {};

GooJS.Math.Vector.add = function(v1, v2){
	
	return [v1[0]+v2[0], v1[1]+v2[1]];
}

GooJS.Math.Vector.sub = function(v1, v2){
	
	return [v1[0]-v2[0], v1[1]-v2[1]];
}

GooJS.Math.Vector.abs = function(v){
	
	return Math.sqrt(v[0]*v[0]+v[1]*v[1]);
}

GooJS.Math.Vector.mul = function(p1, p2){
	return [p1[0]*p2[0], p1[1]*p2[1]];
}

GooJS.Math.Vector.scale = function(v, s){
	return [v[0]*s, v[1]*s];
}

GooJS.Math.Vector.expand = function(v){
	return [v[0], v[0], 1];
}
/**
 * 点乘
 */
GooJS.Math.Vector.dot = function(p1, p2){
	return p1[0]*p2[0]+p1[1]*p2[1];
}
/**
 * 向量归一
 */
GooJS.Math.Vector.normalize = function(v){
	var d = GooJS.Math.Vector.abs(v),
		r = [];
	r[0] = v[0]/d;
	r[1] = v[1]/d;
	return r
}
/**
 * 距离
 */
GooJS.Math.Vector.distance = function(v1, v2){
	return this.abs(this.sub(v1, v2));
}

GooJS.Math.Vector.middle = function(v1, v2){
	return [(v1[0]+v2[0])/2,
			(v1[1]+v2[1])/2];
}

/**
 * 2维矩阵运算类
 */
GooJS.Math.Matrix = {};

GooJS.Math.Matrix.identity = function(){
	return [1, 0, 0, 1, 0, 0];
}
/**
 * 两个3x2矩阵的乘法
 * 其实是两个一下形式的3x3矩阵的乘法
 *	a	c	e
 *	b	d	f
 *	0	0	1
 */
GooJS.Math.Matrix.mul = function(m1, m2){
	return [
      m1[0] * m2[0] + m1[2] * m2[1],
      m1[1] * m2[0] + m1[3] * m2[1],
      m1[0] * m2[2] + m1[2] * m2[3],
      m1[1] * m2[2] + m1[3] * m2[3],
      m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
      m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
   ];
}

GooJS.Math.Matrix.translate = function(m, v){
	return this.mul([1, 0, 0, 1, v[0], v[1]], m);
}

GooJS.Math.Matrix.rotate = function(m, angle){
	var sin = Math.sin(angle),
		cos = Math.cos(angle);
	return this.mul([cos, sin, -sin, cos, 0, 0], m);
}

GooJS.Math.Matrix.scale = function(m, v){
	return this.mul([v[0], 0, 0, v[1], 0, 0], m);
}

/**
 * 求3x3矩阵的逆矩阵，算法来自tdl
 * http://code.google.com/p/webglsamples/source/browse/tdl/math.js
 */
GooJS.Math.Matrix.inverse = function(m){
	var t00 = m[1*3+1] * m[2*3+2] - m[1*3+2] * m[2*3+1],
		t10 = m[0*3+1] * m[2*3+2] - m[0*3+2] * m[2*3+1],
		t20 = m[0*3+1] * m[1*3+2] - m[0*3+2] * m[1*3+1],
		d = 1.0 / (m[0*3+0] * t00 - m[1*3+0] * t10 + m[2*3+0] * t20);
	return [ d * t00, -d * t10, d * t20,
			-d * (m[1*3+0] * m[2*3+2] - m[1*3+2] * m[2*3+0]),
			d * (m[0*3+0] * m[2*3+2] - m[0*3+2] * m[2*3+0]),
			-d * (m[0*3+0] * m[1*3+2] - m[0*3+2] * m[1*3+0]),
			d * (m[1*3+0] * m[2*3+1] - m[1*3+1] * m[2*3+0]),
			-d * (m[0*3+0] * m[2*3+1] - m[0*3+1] * m[2*3+0]),
			d * (m[0*3+0] * m[1*3+1] - m[0*3+1] * m[1*3+0])];
}
/**
 * 将3x2矩阵扩展成3x3
 *	a	c	e
 *	b	d	f
 *	0	0	1
 * http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#transformations
 */
GooJS.Math.Matrix.expand = function(m){
	return [
		m[0], m[1], 0, 
		m[2], m[3], 0, 
		m[4], m[5], 1
	]
}
/**
 * 矩阵左乘
 */
GooJS.Math.Matrix.mulVector = function(m, v){
	var r = [];
	for(var i =0; i < 3; i++){
		r[i] = v[0]*m[i]+v[1]*m[i+3]+v[2]*m[i+6];
	}
	return r;
}
/**
 * 基本元素
 */
GooJS.Element = function(){
	
	//用来判断mouseout事件
	this.__mouseover__ = false;
	
	this.id = 0;

	this.__GUID__ = GooJS.Util.genGUID();
	
	//轴对齐包围盒， 左上和右下
	this.AABB = [[0, 0], [0, 0]];
	
	this.z = 0;
	
	this.fill = true;
	
	this.stroke = true;
	
	this.style = null;
	
	this._transform = null;
	//transform扩展成3x3后的逆矩阵
	this._transformInverse = null;

	this.__userdefine__ = {};

	this.visible = true;

	this.children = {};
	// 用来判断相交的线宽
	this.intersectLineWidth = 0;
}

GooJS.Element.prototype = {
	
	//通过AABB判断鼠标是否点击到这个区域
	//加速判断
	intersectAABB : function(x, y){
		return GooJS.Math.intersectAABB([x,y], this.AABB);
	},
	
	translate : function(x, y){
		if(!this._transform){
			this._transform = GooJS.Math.Matrix.identity();
		} 
		this._transform = GooJS.Math.Matrix.translate(this._transform, [x, y]);
		// this.updateTransformInverse();
	},
	
	rotate : function(angle){
		if(!this._transform){
			this._transform = GooJS.Math.Matrix.identity();
		} 
		this._transform	= GooJS.Math.Matrix.rotate(this._transform, angle);
		// this.updateTransformInverse();
	},

	scale : function(v){
		if(typeof v == 'number'){
			v = [v, v];
		}
		if(!this._transform){
			this._transform = GooJS.Math.Matrix.identity();
		} 
		this._transform	= GooJS.Math.Matrix.scale(this._transform, v);
		// this.updateTransformInverse();
	},

	updateTransformInverse : function(){
		this._transformInverse = GooJS.Math.Matrix.inverse(
									GooJS.Math.Matrix.expand(this._transform));
	},

	getTransformInverse : function(){
		return this._transformInverse;	
	},

	getTransform : function(){
		return this._transform;
	},

	setTransform : function(m){
		this._transform = m;
		// this.updateTransformInverse();
	},

	pushMatrix : function(m){
		this._transform = GooJS.Math.Matrix.mul(m, this._transform);
	},

	popMatrix : function(){
		var t = this._transform;
		this._transform = GooJS.Math.Matrix.identity();
		return t;
	},

	getTransformedAABB : function(){
		var point = [],
			M = GooJS.Math.Matrix,
			V = GooJS.Math.Vector;
		point[0] = M.mulVector(this._transform, V.expand(this.AABB[0]));
		point[1] = M.mulVector(this._transform, V.expand(this.AABB[1]));
		point[2] = M.mulVector(this._transform, [this.AABB[0][0], this.AABB[1][1]]);
		point[3] = M.mulVector(this._transform, [this.AABB[1][0], this.AABB[0][1]]);
		return GooJS.Math.computeAABB(point);
	},

	intersect : function(x, y, ghost){},
	
	draw : function(context){},
	
	computeAABB : function(){},

	addElement : function(elem){
		this.children[elem.__GUID__] = elem;
	},

	removeElement : function(elem){
		delete this.children[elem.__GUID__];
	}
}

GooJS.Element.derive = function(sub){
				
	sub.prototype = new GooJS.Element();
	sub.prototype.constructor = sub;
}
/**
 * 样式
 * @config 	fillStyle,
 * @config 	strokeStyle,
 * @config	lineWidth,
 * @config	shadowColor,
 * @config	shadowOffsetX,
 * @config	shadowOffsetY,
 * @config	shadowBlur,
 * @config 	globalAlpha
 */
GooJS.Style = function(opt_options){
	
	GooJS.Util.extend(this, opt_options);
}

GooJS.Style.prototype.__STYLES__ = ['fillStyle', 
					'strokeStyle', 
					'lineWidth', 
					'shadowColor', 
					'shadowOffsetX', 
					'shadowOffsetY',
					'shadowBlur',
					'globalAlpha',
					'font'];

GooJS.Style.prototype.bind = function(context){
	
	for(var i = 0; i < this.__STYLES__.length; i++){
		var name = this.__STYLES__[i];
		if(name in this){
			context[name] = this[name];
		}
	}
}
/**
 * 线条
 * @config start
 * @config end
 * @config width
 * @config style
 */
GooJS.Line = function(options){
	
	GooJS.Element.call( this );

	var defaultOpt = {
		'start' : [0, 0],
		'end' : [0, 0],
		'width' : 0			//是用来判断鼠标是否在该条线上，可能会大于显示宽度
	}
	
	GooJS.Util.extend(defaultOpt, options);
	GooJS.Util.extend(this, defaultOpt);
	
	this.computeAABB();
}

GooJS.Element.derive(GooJS.Line);
/**
 * @overridden
 */
GooJS.Line.prototype.computeAABB = function(){

	this.AABB = GooJS.Math.computeAABB([this.start, this.end]);
	//将包围盒扩展成一个矩形的包围盒
	if(this.AABB[0][0] == this.AABB[1][0]){	//垂直线
		this.AABB[0][0] -= this.width/2;
		this.AABB[1][0] += this.width/2;
	}
	if(this.AABB[0][1] == this.AABB[1][1]){	//水平线
		this.AABB[0][1] -= this.width/2;
		this.AABB[1][1] += this.width/2;
	}
}
/**
 * @overridden
 */
GooJS.Line.prototype.draw = function(context){
	
	context.beginPath();
	context.moveTo(this.start[0], this.start[1]);
	context.lineTo(this.end[0], this.end[1]);
	context.stroke();

}
/**
 * @overriden
 */
GooJS.Line.prototype.intersect = function(x, y){
	
	if(!this.intersectAABB(x, y)){
		return false;
	}
	//计算投影点
	var V = GooJS.Math.Vector,
		a = [x, y]
		b = this.start,
		c = this.end,
		ba = [a[0]-b[0], a[1]-b[1]],
		bc = [c[0]-b[0], c[1]-b[1]],
		dd = V.dot(V.normalize(bc), ba),	//ba在bc上的投影长度
		d = V.add(b, V.scale(V.normalize(bc), dd));		//投影点	
		
		var distance = V.abs(V.sub(a, d));
		return distance < this.width/2;
}

/**
 * 矩形
 * @config start
 * @config size
 * @config style
 */
GooJS.Rectangle = function(options){
	
	GooJS.Element.call( this );
	
	var defaultOpt = {
		'start' : [0, 0],
		'size' : [0, 0]
	}
	
	GooJS.Util.extend(defaultOpt, options);
	GooJS.Util.extend(this, defaultOpt);

	this.computeAABB();
}

GooJS.Element.derive(GooJS.Rectangle);
/**
 * @overridden
 */
GooJS.Rectangle.prototype.computeAABB = function(){
	
	this.AABB = GooJS.Math.computeAABB([this.start, [this.start[0]+this.size[0], this.start[1]+this.size[1]]]);
}
/**
 * @overriden
 */
GooJS.Rectangle.prototype.draw = function(context){
	context.beginPath();
	context.rect(this.start[0], this.start[1], this.size[0], this.size[1]);
	if(this.stroke){
		context.stroke();
	}
	if(this.fill){
		context.fill();
	}
}
/**	
 * @overriden
 */
GooJS.Rectangle.prototype.intersect = function(x, y){
	
	return this.intersectAABB(x, y);
}
/**
 * 圆形
 * @config center
 * @config radius
 * @config style
 */
GooJS.Circle = function(options){
	
	GooJS.Element.call( this );
	
	var defaultOpt = {
		'center' : [0, 0],
		'radius' : 0
	}
	
	GooJS.Util.extend(defaultOpt, options);
	GooJS.Util.extend(this, defaultOpt);
	
	this.computeAABB();
}

GooJS.Element.derive(GooJS.Circle);
/**
 * @overridden
 */
GooJS.Circle.prototype.computeAABB = function(){
	
	this.AABB = [[this.center[0]-this.radius, this.center[1]-this.radius],
				 [this.center[0]+this.radius, this.center[1]+this.radius]]
}
/**
 * @overriden
 */
GooJS.Circle.prototype.draw = function(context){
	context.beginPath();
	context.arc(this.center[0], this.center[1], this.radius, 0, 2*Math.PI, false);
	if(this.stroke){
		context.stroke();
	}
	if(this.fill){
		context.fill();
	}

}
/**
 * @overriden
 */
GooJS.Circle.prototype.intersect = function(x, y){

	return GooJS.Math.Vector.abs([this.center[0]-x, this.center[1]-y]) < this.radius;
}

/**
 * 圆弧
 * @config center
 * @config radius
 * @config startAngle
 * @config endAngle
 * @config clockwise
 * @config style
 */
GooJS.Arc = function(options){
	
	GooJS.Element.call( this );
	
	var defaultOpt = {
		'center' : [0, 0],
		'radius' : 0,
		'startAngle' : 0,
		'endAngle' : Math.PI*2
	}
	
	GooJS.Util.extend(defaultOpt, options);
	GooJS.Util.extend(this, defaultOpt);
	
	this.clockwise = options.clockwise;

	this.computeAABB();
}

GooJS.Element.derive(GooJS.Arc);
/**
 * @overridden
 */
GooJS.Arc.prototype.computeAABB = function(){
	
	this.AABB = [[0, 0], [0, 0]];
}
/**
 * @overriden
 */
GooJS.Arc.prototype.draw = function(context){
	context.beginPath();
	context.arc(this.center[0], this.center[1], this.radius, this.startAngle, this.endAngle,  ! this.clockwise);
	if(this.stroke){
		context.stroke();
	}
	if(this.fill){
		context.fill();
	}

}
/**
 * @overriden
 */
GooJS.Arc.prototype.intersect = function(x, y){

	return false;
}
/**
 * 多边形
 * @config points
 * @config style
 */
GooJS.Polygon = function(options){
	
	GooJS.Element.call( this );
	
	var defaultOpt = {
		'points' : []
	}
	
	GooJS.Util.extend(defaultOpt, options);
	GooJS.Util.extend(this, defaultOpt);
	
	this.computeAABB();
}

GooJS.Element.derive(GooJS.Polygon);
/**
 * @overridden
 */
GooJS.Polygon.prototype.computeAABB = function(){
	
	this.AABB = GooJS.Math.computeAABB(this.points);
}
/**
 * @overriden
 */
GooJS.Polygon.prototype.draw = function(context){
	context.beginPath();
	
	context.moveTo(this.points[0][0], this.points[0][1]);
	for(var i =1; i < this.points.length; i++){
		context.lineTo(this.points[i][0], this.points[i][1]);
	}
	context.closePath();
	if(this.stroke){
		context.stroke();
	}
	if(this.fill){
		context.fill();
	}

}
/**
 * @overriden
 */
GooJS.Polygon.prototype.intersect = function(x, y){
	
	if(!this.intersectAABB(x, y)){
		return false;
	}
	//考虑translate
	x = x-this._translate[0];
	y = y-this._translate[1];
	
	var len = this.points.length,
		angle = 0;
	for(var i =0; i < len; i++){
		var vec1 = GooJS.Math.normalize([this.points[i][0]-x, this.points[i][1]-y]),
			j = (i+1)%len,
			vec2 =  GooJS.Math.normalize([this.points[j][0]-x, this.points[j][1]-y]),
			foo = Math.acos(GooJS.Math.dot(vec1, vec2));
			
			angle += foo;
	}
	return Math.abs(angle - 2*Math.PI) < 0.1;
}

GooJS.Sector = function(options){

	GooJS.Element.call( this );

	var defaultOpt = {
		'center' : [0, 0],
		'innerRadius' : 0,
		'outerRadius' : 0,
		'startAngle' : 0,
		'endAngle' : 0,
		'clockwise' : true
	}
	
	GooJS.Util.extend(defaultOpt, options);
	GooJS.Util.extend(this, defaultOpt);
	
	this.computeAABB();
}

GooJS.Element.derive(GooJS.Sector);
/**
 * @overriden
 */
GooJS.Sector.prototype.computeAABB = function(){

	this.AABB = [0, 0];
}
/**
 * @overriden
 */
GooJS.Sector.prototype.intersect = function(x, y){

	var V = GooJS.Math.Vector,
		startAngle = this.startAngle,
		endAngle = this.endAngle,
		r1 = this.innerRadius,
		r2 = this.outerRadius,
		c = this.center,
		v = V.sub([x, y], c),
		r = V.abs(v),
		pi2 = Math.PI * 2;

	if(r < r1 || r > r2){
		return false;
	}
	var angle = Math.atan2(v[1], v[0]);

	//need to constraint the angle in 0 - 360

	if(angle < 0){
		angle = angle+pi2;
	}
	
	if(this.clockwise){
		
		return angle < endAngle && angle > startAngle;
	}else{
		startAngle =  pi2 - startAngle;
		endAngle = pi2 - endAngle;
		return angle > endAngle && angle < startAngle;
	}

}
/**
 * @overriden
 */
GooJS.Sector.prototype.draw = function(context){

	var V = GooJS.Math.Vector;
		startAngle = this.startAngle,
		endAngle = this.endAngle,
		r1 = this.innerRadius,
		r2 = this.outerRadius,
		c = this.center;

	if( ! this.clockwise ){
		startAngle =  Math.PI*2 - startAngle;
		endAngle =  Math.PI*2 - endAngle;
	}

	var	startInner = V.add(c, [r1 * Math.cos(startAngle), r1 * Math.sin(startAngle)]),
		startOuter = V.add(c, [r2 * Math.cos(startAngle), r2 * Math.sin(startAngle)]),
		endInner = V.add(c, [r1 * Math.cos(endAngle), r1 * Math.sin(endAngle)]),
		endOuter = V.add(c, [r2 * Math.cos(endAngle), r2 * Math.sin(endAngle)]);

	context.beginPath();
	context.moveTo(startInner[0], startInner[1]);
	context.lineTo(startOuter[0], startOuter[1]);
	context.arc(c[0], c[1], r2, startAngle, endAngle, ! this.clockwise);
	context.lineTo(endInner[0], endInner[1]);
	context.arc(c[0], c[1], r1, endAngle, startAngle, this.clockwise);

	if(this.stroke){
		context.stroke();
	}
	if(this.fill){
		context.fill();
	}

}

/**
 * @config segments
 * @config sameStyle
 */
GooJS.Path = function(options){

	GooJS.Element.call( this );

	var defaultOpt = {
		segments : [],
		sameStyle : true,
	},
		me = this;
	GooJS.Util.extend(defaultOpt, options);
	GooJS.Util.extend(this, defaultOpt);

	this.computeAABB()

}

GooJS.Element.derive(GooJS.Path);
/**
 * @overridden
 */
GooJS.Path.prototype.computeAABB = function(){
	this.AABB = [[0, 0], [0, 0]];
}
/**
 * @overridden
 */
GooJS.Path.prototype.draw = function(context){
	
	if(this.sameStyle){
		this.drawWithSameStyle(context);
		
	}else{

		this.drawWithDifferentStyle(context);
	}
}

GooJS.Path.prototype.drawWithSameStyle = function(context){
	
	var me = this,
		l = this.segments.length,
		segs = this.segments;

	context.beginPath();
	context.moveTo(segs[0].point[0], segs[0].point[1]);
	for(var i =1; i < l; i++){

		if(segs[i-1].handleOut || segs[i].handleIn){
			var prevHandleOut = segs[i-1].handleOut || segs[i-1].point,
				handleIn = segs[i].handleIn || segs[i].point;
			context.bezierCurveTo(prevHandleOut[0], prevHandleOut[1],
					handleIn[0], handleIn[1], segs[i].point[0], segs[i].point[1]);
		}
		else{
			context.lineTo(segs[i].point[0], segs[i].point[1]);
		}

	}
	if(this.fill){
		context.fill();
	}
	if(this.stroke){
		context.stroke();
	}	
}

GooJS.Path.prototype.drawWithDifferentStyle = function(context){
	
	var me = this,
		l = this.segments.length,
		segs = this.segments;

	for(var i =0; i < l-1; i++){

		context.save();
		segs[i].style && segs[i].style.bind(context);

		context.beginPath();
		context.moveTo(segs[i].point[0], segs[i].point[1]);

		if(segs[i].handleOut || segs[i+1].handleIn){
			var handleOut = segs[i].handleOut || segs[i].point,
				nextHandleIn = segs[i+1].handleIn || segs[i+1].point;
			context.bezierCurveTo(handleOut[0], handleOut[1],
					nextHandleIn[0], nextHandleIn[1], segs[i+1].point[0], segs[i+1].point[1]);
		}
		else{
			context.lineTo(segs[i+1].point[0], segs[i+1].point[1]);
		}

		if(this.stroke){
			context.stroke();
		}
		if(this.fill){
			context.fill();
		}
		context.restore();
	}
}

GooJS.Path.prototype.smooth = function(degree){
	var Vector = GooJS.Math.Vector,
		len = this.segments.length,
		middlePoints = [],
		segs = this.segments;

	function computeVector(a, b, c){
		var m = Vector.middle(b, c);
		return Vector.sub(a, m);
	}

	for(var i = 0; i < len; i++){
		var point = segs[i].point,
			nextPoint = (i == len-1) ? segs[0].point : segs[i+1].point;
		middlePoints.push(
				Vector.middle(point, nextPoint));
	}

	for(var i = 0; i < len; i++){
		var point = segs[i].point,
			middlePoint = middlePoints[i],
			prevMiddlePoint = (i == 0) ? middlePoints[len-1] : middlePoints[i-1],
			degree = segs[i].smoothLevel || degree || 1;
		var middleMiddlePoint = Vector.middle(middlePoint, prevMiddlePoint);
			v1 = Vector.sub(middlePoint, middleMiddlePoint),
			v2 = Vector.sub(prevMiddlePoint, middleMiddlePoint);

		var dv = computeVector(point, prevMiddlePoint, middlePoint);
		//use degree to scale the handle length
		segs[i].handleIn = Vector.add(Vector.add(middleMiddlePoint, Vector.scale(v2, degree)), dv);
		segs[i].handleOut = Vector.add(Vector.add(middleMiddlePoint, Vector.scale(v1, degree)), dv);
	}
	segs[0].handleOut = segs[0].handleIn = null;
	segs[len-1].handleIn = segs[len-1].handleOut = null;
	
}

GooJS.Path.prototype.pushPoints = function(points){
	for(var i = 0; i < points.length; i++){
		this.segments.push({
			point : points[i],
			handleIn : null,
			handleOut : null
		})
	}
}

/**
 * 图片
 * @config img
 * @config start 
 * @config size
 * @config onload
 */
GooJS.Image = function(options){

	GooJS.Element.call( this );
	
	var defaultOpt = {
		'img' : '',
		'start' : [0, 0],
		'size' : 0,
		'onload' : function(){}
	},
		me = this;
	
	GooJS.Util.extend(defaultOpt, options);
	GooJS.Util.extend(this, defaultOpt);
	
	var needResize = false;
	if(typeof this.img == 'string'){
		if(this.img in GooJS.Image.cache){
			this.img = GooJS.Image.cache[this.img];
		}
		else{
			var img = new Image();
			img.src = this.img;
			
			img.onload = function(){
				GooJS.Image.cache[me.img] = img;
				me.img = img;
				
				//重新计算size和AABB
				if( ! me.size){
					me.size = [me.img.width, me.img.height];
				}
				me.computeAABB();

				me.onload.call(me);
			}
		}
	}

	this.computeAABB();
}

GooJS.Image.cache = {};

GooJS.Element.derive(GooJS.Image);
/**
 * @overridden
 */
GooJS.Image.prototype.computeAABB = function(){

	this.AABB = GooJS.Math.computeAABB([this.start, [this.start[0]+this.size[0], this.start[1]+this.size[1]]]);
}
/**
 * @overriden
 */
GooJS.Image.prototype.draw = function(context){
	//没加载完就不绘制
	if(typeof this.img != 'string'){
		if(!this.size){	//默认大小
			context.drawImage(this.img, this.start[0], this.start[1]);
		}else{
			context.drawImage(this.img, this.start[0], this.start[1], this.size[0], this.size[1]);
		}
	}

}
/**
 * @overriden
 */
GooJS.Image.prototype.intersect = function(x, y){

	return this.intersectAABB(x, y);
}

/**
 * 图片
 * @config img
 * @config start 
 * @config size
 * @config font
 * @config textBaseLine  top||
 */
GooJS.Text = function(options){

	GooJS.Element.call( this );
	
	var defaultOpt = {
		'text' : '',
		'start' : [0, 0],
		'size' : [0, 0],
		'font' : '',
		'textAlign' : '',
		'textBaseline' : ''
	};

	GooJS.Util.extend(defaultOpt, options);
	GooJS.Util.extend(this, defaultOpt);
	
	this.computeAABB();
}


GooJS.Element.derive(GooJS.Text);
/**
 * @overridden
 */
GooJS.Text.prototype.computeAABB = function(){

	this.AABB = GooJS.Math.computeAABB([this.start, [this.start[0]+this.size[0], this.start[1]+this.size[1]]]);
}
/**
 * @overriden
 */
GooJS.Text.prototype.draw = function(context){
	if(this.font){
		context.font = this.font;
	}
	if(this.textAlign){
		context.textAlign = this.textAlign;
	}
	if(this.textBaseline){
		context.textBaseline = this.textBaseline
	}
	if(this.fill){
		if(this.size.length && this.size[0]){
			context.fillText(this.text, this.start[0], this.start[1], this.size[0]);
		}else{
			context.fillText(this.text, this.start[0], this.start[1]);
		}
	}
	if(this.stroke){
		if(this.size.length && this.size[0]){
			context.strokeText(this.text, this.start[0], this.start[1], this.size[0]);
		}else{
			context.strokeText(this.text, this.start[0], this.start[1]);
		}
	}

	this.autoResize(context);
}

GooJS.Text.prototype.autoResize = function(context){

	if(! this.size[0] || this.needResize){
		this.size[0] = context.measureText(this.text).width;
		this.size[1] = context.measureText('m').width;
	}
}
/**
 * @overriden
 */
GooJS.Text.prototype.intersect = function(x, y){

	return this.intersectAABB(x, y);
}
/**
 * 自定义形状
 * @config style
 */
GooJS.Custom = function(options){
	
	GooJS.Element.call( this );
	
	GooJS.Util.extend(this, options);
}

GooJS.Element.derive(GooJS.Custom);

GooJS.Custom.draw = function(){};
GooJS.Custom.intersect = function(){};
/**
 * 事件对象
 */
GooJS.Event = function(options){

	GooJS.Util.extend(this, options);
}

GooJS.BigArray = function(data){
	
	var data = data || [];
	this.array = data;

	this._min = 999999999;
	this._max = 0;
	this._average = 0;
	this._sum = 0;

	this.__dirty__ = true;
}

GooJS.BigArray.prototype.forEach = function(func){
	var l = this.array.length,
		a = this.array;
	for(var i = 0; i < l; i++){
		func(i, a[i]);
	}
}

GooJS.BigArray.prototype.setData = function(data){

	this.array = data.slice();
	this.updateAll();
}

GooJS.BigArray.prototype.push = function(item){
	
	this.array.push(item);
	
	if(item < this._min){
		this._min = item;
	}
	if(item > this._max){
		this._max = item;
	}
	this._sum += item;
	this._average = this._sum/this.array.length;
}

GooJS.BigArray.prototype.pop = function(){
	var item = this.array.pop();
	if(item == this._min){
		this.min();
	}
	if(item == this._max){
		this.max();
	}
	this._sum -= item;
	this._average = this._sum / this.array.length;
}

GooJS.BigArray.prototype.get = function(index){
	return this.array[index];
}

GooJS.BigArray.prototype.set = function(index, item){
	var oldItem = this.array[index] || 0;
	this.array[index] = item;
	
	if(item < this._min){
		this._min = item;
	}
	else if(oldItem == this._min){
		this.min();
	}

	if(data > this._max){
		this._max = item;
	}
	else if(oldItem == this._max){
		this.max();
	}

	this._sum += item-oldItem;
	this._average = this._sum/this.array.length;
}

GooJS.BigArray.prototype.remove = function(index){
	var item = this.array[index];
	this.array.splice(index, 1);
	if(item == this._min){
		this.min();
	}
	if(item == this._max){
		this.max();
	}
	this._sum -= item;
	this._average = this._sum / this.array.length;
}

GooJS.BigArray.prototype.updateAll = function(){
	this.min();
	this.max();
	this.average();
	this.__dirty__ = false;
}

GooJS.BigArray.prototype.min = function(){
	var min = this._min,
		length = this.array.length,
		array = this.array;

	if( ! this.__dirty__){
		return min;
	}
	this._min = min = Math.min.apply(Math, this.array);
	return min;
}
GooJS.BigArray.prototype.max = function(){
	var max = this._max,
		length = this.array.length,
		array = this.array;

	if( ! this.__dirty__){
		return max;
	}
	this._max = max = Math.max.apply(Math, this.array);
	return max;
}
GooJS.BigArray.prototype.sum = function(){
	var sum = this._sum,
		length = this.array.length,
		array = this.array;

	if( ! this.__dirty__){
		return sum;
	}
	sum = 0;
	for(var i = 0; i < length; i++){
		sum += array[i];
	}
	this._sum = sum;
	return sum;
}

GooJS.BigArray.prototype.average = function(){
	var average = this._average,
		length = this.array.length,
		array = this.array;

	if( ! this.__dirty__){
		return average;
	}

	average = this.sum()/length;
	this._average = average;
	return average;
}

GooJS.BigArray.prototype.map = function(mapMin, mapMax){
	
	var max = this.max(),
		min = this.min(),
		a = this.array,
		l = this.array.length;

	if(max > min){
		mapStep = (mapMax - mapMin) / (max - min);
	}else{
		mapStep = 0;
	}
	if(mapStep){
		for(var i = 0; i < l; i++){
			a[i] = (a[i] - min) * mapStep + mapMin;
		}
	}else{
		var aver = (mapMin+mapMax)/2;

		for(var i = 0; i < l; i++){
			a[i] = aver;
		}
	}
	this.updateAll();
}

GooJS.BigArray.prototype.normalize = function(){
	var min = this.min(),
		max = this.max(),
		sum = this.sum();

	this.map(min/sum, max/sum);
}

GooJS.BigArray.prototype.length = function(){
	return this.array.length;
}
//
// static methods
//
GooJS.BigArray.range = function(min, max, step){
	var data = [],
		step = step || 1;
	for(var i = min; i <= max; i+= step){
		data.push(i);
	}
	return new GooJS.BigArray(data);
}
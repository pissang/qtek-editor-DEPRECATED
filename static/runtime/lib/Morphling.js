/**
 * canvas动画
 * 
 * @author shenyi
 * @dependence GooJS
 * 
 * TODO: 
 * 		动画后需要重新computeAABB
 */
var Morphling = {};
GooJS.Animate = Morphling;

/**
 * @config stage
 * @config frameCount(20)
 * @config autoRun(true)
 */
Morphling.create = function(options){
	
	var options = options || {},
	
		stage = options.stage || null,
	
		controllerPool = {},
		
		frameCount = options.frameCount || 50,
		
		timer = null,
		
		autoRun = options.autoRun || true,

		controllerNum = 0,

		onframe = function(){}
	
	function addController(controller){
		
		controllerPool[controller.__GUID__] = controller;
		controller._context = this;

		controllerNum++;
	}	
	
	function removeController(controller){
		
		if(controllerPool[controller.__GUID__]){

			controllerNum --;
		}

		delete controllerPool[controller.__GUID__];
		controller._context = null;

	}
	
	function addAnimation(animation){
		
		animation._context = this;
		for(var i =0; i < animation._controllerChain.length; i++){
			this.addController(animation._controllerChain[i]);
		}
	}
	
	function removeAnimation(animation){
		
		for(var i =0; i < animation._controllerChain.length; i++){
			this.removeController(animation._controllerChain[i]);
		}
	}
	
	function schedule(){
		
		var time = new Date().getTime();
		
		for(var guid in controllerPool){
			controllerPool[guid].step(time);
		}
		
		if(controllerNum > 0){

			stage && stage.render();
		}

		onframe && onframe();
	}
	
	function run(){
		if(timer){
			clearInterval(timer);
		}
		timer = setInterval(schedule, 1000/frameCount);

	}
	
	function stop(){

		clearInterval(timer);
	}
	
	autoRun && run();
	
	return {
		
		'setStage' : function(_stage){stage = _stage},

		'getStage' : function(){return stage},
		
		'getFrameCount' : function(){return frameCount},
		
		'addController' : addController,
		
		'removeController' : removeController,
		
		'addAnimation' : addAnimation,
		
		'removeAnimation' : removeAnimation,
		
		'run' : run,
		
		'stop' : stop,

		'onframe' : function(func){
			onframe = func;
		}
	}
}

Morphling.Util = {};
/**
 * 获取rgb颜色， from highlightFade
// http://jquery.offput.ca/highlightFade/
 */
Morphling.Util.getRGB = function(color){
	var result;

	// Check if we're already dealing with an array of colors
	if ( color && color.constructor == Array && color.length == 3 )
		return color;

	// Look for rgb(num,num,num)
	if (result = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/.exec(color))
		return [parseInt(result[1],10), parseInt(result[2],10), parseInt(result[3],10)];

	// Look for rgb(num%,num%,num%)
	if (result = /rgb\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*\)/.exec(color))
		return [parseFloat(result[1])*2.55, parseFloat(result[2])*2.55, parseFloat(result[3])*2.55];

	// Look for #a0b1c2
	if (result = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(color))
		return [parseInt(result[1],16), parseInt(result[2],16), parseInt(result[3],16)];

	// Look for #fff
	if (result = /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/.exec(color))
		return [parseInt(result[1]+result[1],16), parseInt(result[2]+result[2],16), parseInt(result[3]+result[3],16)];

	// Look for rgba(0, 0, 0, 0) == transparent in Safari 3
	if (result = /rgba\(0, 0, 0, 0\)/.exec(color))
		return colors['transparent'];
}


/**
 * TODO 添加关键帧
 * 		默认onframe函数
 * 
 * @config target		GooJS.Element || GooJS.Style
 * @config life(1000)
 * @config delay(0)
 * @config loopDelay
 * @config loop(true)
 * @config onframe
 * @config transition(opt)
 * @config ondestroy(opt)
 * @config onrestart(opt)
 */
Morphling.Controller = function(options){
	
	this._targetPool = options.target || new Object();
	if(this._targetPool.constructor != Array){
		this._targetPool = [this._targetPool];
	}
	
	this.__GUID__ = GooJS.Util.genGUID();
	
	this._context = null;
	//生命周期
	this._life = options.life || 1000;	
	//延时
	this._delay = options.delay || 0;
	//开始时间
	this._startTime = new Date().getTime()+this._delay;//单位毫秒
	
	//结束时间
	this._endTime = this._startTime + this._life*1000;
	
	//是否循环
	this.loop = typeof(options.loop) == 'undefined' ? false : options.loop;
	
	this.loopDelay = options.loopDelay || 0;
	
	this.transition = options.transition || null;
	
	this.onframe = options.onframe || null;
	
	this.ondestroy = options.ondestroy || null;
	
	this.onrestart = options.onrestart || null;
}

Morphling.Controller.prototype.step = function(time){
	
	
	var percent = (time-this._startTime)/this._life;

	//还没开始
	if(percent < 0){
		return;
	}
	//结束
	if(percent >= 1){
		if(this.loop){
			this.restart();
			
			//重新开始周期
			this.fire('restart')
			
		}else{
			//删除这个控制器
			this._context.removeController(this);
			
			this.fire('destroy');
		}
		//设置到1，防止最后精度问题所出现的不到1的情况
		percent = 1;
	}
	
	schedule = this.transition ? this.transition(percent) : percent;
	
	this.fire('frame', schedule);
}

Morphling.Controller.prototype.restart = function(){
	
	this._startTime = new Date().getTime() + this.loopDelay;
}
/**
 * 批量调用事件
 */
Morphling.Controller.prototype.fire = function(eventType, arg){
	
	for(var i = 0; i < this._targetPool.length; i++){
		this['on'+eventType] && this['on'+eventType](this._targetPool[i], arg);
	}
}

/**
 * 动画链
 * 
 * TODO : 完成Loop功能
 * 		  几个frame之间属性不一样的话是否要加入默认属性值？？
 * 		keyFrame可以是style？？？
 * 		:加入callback
 * @config keyFrames	{
 * 							0%:{
 * 									prop : value
 * 								}
 * 							...
 * 							100%:{
 * 									prop : value
 * 								}
 * 						}
 * 						
 * @config target
 * @config life(1000)
 * @config transition(opt)
 * @config loop(true)
 */
Morphling.Animation = function(options){
	
	this._targetPool = options.target || null;
	if(this._targetPool.constructor != Array){
		this._targetPool = [this._targetPool];
	}
	
	this._life = options.life || 1000;
	
	this.loop = options.loop || true;
	
	this._controllerChain = [];
	
	this._context = null;
	
	var delay = 0,
		keyFrame,
		timeline = [];
	//遍历每个关键帧，生成一个时间轴
	//处理每个关键帧中的属性
	for(var percent in options.keyFrames){
		
		delay = parseInt(percent)/100*this._life;
		keyFrame = options.keyFrames[percent];
		
		//判断几个元素是否都有这个属性, 而且类型相同
		//否则则删除
		/*
		for(var prop in keyFrame){
			
			var type = typeof(this._targetPool[0][prop]);
			
			for(var i = 0; i <this._targetPool.length; i++){
				if(! prop in this._targetPool[i]){
					delete keyFrame[prop];
					break;
				}
				//类型分析（不递归）
				if(typeof(this._targetPool[i][prop]) != type){//类型不全一样
					delete keyFrame[prop];
					break;
				}
			}
		}
		*/
		//放入时间轴
		timeline.push({
			'time' : delay,
			'frame' : keyFrame
		})
	}
	//每两个关键帧之间生成一个controller
	for(var i =0; i < timeline.length-1; i++){
		var kf = timeline[i]['frame'],
			kfn = timeline[i+1]['frame'],
			life = timeline[i+1]['time'] - timeline[i]['time'],
			delay = timeline[i]['time'],
			controller;
			
		controller = new Morphling.Controller({
			'delay' : delay,
			'life' : life,
			'target' : this._targetPool,
			'loop' : false,
			'transition' : options.transition,
			'onframe' : (function(kf, kfn){		//这一帧和下一帧
				
				return function(target, schedule){
					
					for(var propName in kf){
						target[propName] = interpolate(kf[propName], kfn[propName]);
					}
					//递归对每个数值进行插值运算
					function interpolate(prop, propNext){
						switch(typeof(prop)){
							case 'number':
								return prop + (propNext-prop)*schedule;
							case 'object':
								if(prop.constructor == Array){	//数组
									var targetProp = [];
									for(var i = 0; i < prop.length; i++){
										targetProp.push(interpolate(prop[i], propNext[i]));
									}
									return targetProp;
								}else{
									var targetProp = {}
									for(var key in prop){
										targetProp[key] = interpolate(prop[key], propNext[key]);
									}
									return targetProp;
								}
								break;
							case 'string':
								//颜色变换
								prop = Morphling.Util.getRGB(prop);
								propNext = Morphling.Util.getRGB(propNext);
								var targetProp = interpolate(prop, propNext);
								targetProp[0] = parseInt(targetProp[0]);
								targetProp[1] = parseInt(targetProp[1]);
								targetProp[2] = parseInt(targetProp[2]);
								targetProp = 'rgb('+targetProp.join(',')+')';
								return targetProp
							default:
								throw new Error('error of prop type:'+prop)
						}
					}
				}
			})(kf, kfn)
		})
		
		this._controllerChain.push(controller);
	}
}

Morphling.Animation.prototype.getController = function(index){
	
	return this._controllerChain[index];
}

Morphling.Transition = {
	'linear' : function(percent){return percent},
	'reverse' : function(percent){return 1-percent},
	'parabola' : function(percent){return Math.pow(percent, 2)},
	'antiparabola' : function(percent){return 1-Math.pow(percent, 2)},
	'sinoidal' : function(percent){return (-Math.cos(percent * Math.PI)/2) + 0.5},
	'wobble' : function(percent){return (-Math.cos(percent * Math.PI * (9 * percent))/2) + 0.5},
	'spring' : function(percent){return 1 - (Math.cos(percent * 4.5 * Math.PI) * Math.exp(-percent * 6))},
	'bounceOut' : function(percent) {
		if (percent < 1/2.75) {
			return (7.5625*percent*percent);
		} else if (percent < 2/2.75) {
			return (7.5625*(percent-=1.5/2.75)*percent+0.75);
		} else if (percent < 2.5/2.75) {
			return (7.5625*(percent-=2.25/2.75)*percent+0.9375);
		} else {
			return (7.5625*(percent-=2.625/2.75)*percent +0.984375);
		}
	}
}
//===================
// Console.js
// 控制台
//===================
define(function(require, exports, module){

	var UI = require('../UI/index');
	UI.Mixin = require('../UI/Mixin/index');
	var hub = require('./Hub').getInstance();

	var view;

	//some configs
	// todo add scale
	var unitLength = 60,	//px
		unit = 0.1,	// second
		timeNow = 0;

	//some data
	var tracks = new Backbone.Collection,	//name, objectName, query, keypoints
		keyframes = new Backbone.Collection,	//time keypoints, keypoints
		keypoints = new Backbone.Collection 	// trackId keyframeId value

	var trackColorHashMap = {};
	// some status
	var autoKeyframe = true;

	var playInterval;

	// 支持动画的对象类型的hashmap
	var acceptObjectType = {
		'node' : [ THREE.Object3D, THREE.Mesh, THREE.Camera, THREE.Light ],
		'material' : [ THREE.Material ]
	}

	function getInstance(){
		if(view){
			return {
				view : view
			}
		}


		view = new UI.Panel.View;
		view.setName('Animation');
		view.$el.attr('id', 'Animation');

		initView();

		handleHubEvent();

		init();

		return {
			view : view
		}
	}

	function initView(){

		view.$list.html( template );

		var timelineView = new UI.Layer.View;
		timelineView.$list.html( timelineTemplate );
		timelineView.$el.attr("id", "AnimationTimelineContainer");

		UI.Mixin.Scrollable.applyTo( timelineView );

		view.$list.find('.column-2').append( timelineView.$el );

		drawTimelineScale( unit, unitLength, timelineView.$list.find('canvas.timeline-scale')[0] );

		// init the handle for dragging keyframe
		var $keyframeHandle = view.$el.find('#KeyframeHandle');
		$keyframeHandle.draggable({
			handle : '.slider',
			axis : 'x',
			containment: 'parent',
			snap : '.keypoint',	//todo 目前好像没起什么作用的样子=.=
			drag : function(e, ui){
				//update keyframe time on the line;
				timeNow =  positionToTime( ui.position.left ) ;	

				$keyframeHandle.find('.keyframeTime').html(timeNow + 's');
			}
		})
		$keyframeHandle.css('position', 'absolute');
	}

	function handleHubEvent(){

		var autoAddKeyframeDelay;

		// todo automatic update the name 
		hub.on('updated:object', function(object, queryStr, value, valuePrev){

			if( autoAddKeyframeDelay){
			
				clearTimeout( autoAddKeyframeDelay );
			}
			if( ! autoKeyframe ){
			
				return;
			}

			var type;

			_.each( acceptObjectType, function( Objects, _type){	
			
				_.each( Objects, function( Obj ){

					if( object instanceof Obj){

						type = _type;
					}
				})
			} )
			if( ! type ){	//maybe some strange object=.= not mesh, material, light or camera

				return;
			}

			// 添加一个延迟，防止更新过于频繁
			autoAddKeyframeDelay = setTimeout( function(){

				autoAddKeyframe( object.name, queryStr, type, value);

			}, 500);

		})
	}

	function init(){

		keypoints.on('add', function(keypoint){

			keyframes.getByCid( keypoint.get('keyframeId') ).get('keypoints').push( keypoint );

			tracks.getByCid( keypoint.get('trackId') ).get('keypoints').push( keypoint );

			addKeypoint( keypoint.get('trackId'), keypoint.get('keyframeId'), keypoint.get('value') );
		})
		keypoints.on('remove', function(keypoint){

			keyframes.getByCid( keypoint.get('keyframeId') ).get('keypoints').remove( keypoint );

			tracks.getByCid( keypoint.get('trackId') ).get('keypoints').remove( keypoint );
		})
		keyframes.on('remove', function(keyframe){

			keyframe.get('keypoints').forEach(function(keypoint){

				keypoints.remove( keypoint );
			})
		})
		tracks.on('remove', function(track){

			track.get('keypoints').forEach(function(keypoint){

				keypoints.remove( keypoint );
			})
		})
		tracks.on('add', function(track){

			addTrack( track.get('name') );
		})
	}

	// 设置时间点和指针的位置
	function moveTo( time ){
		timeNow = time;
		
		var $keyframeHandle = view.$el.find('#KeyframeHandle');

		$keyframeHandle.find('.keyframeTime').html( time + 's' );

		$keyframeHandle.css('left', timeToPosition( time ) );
	}

	function timeToPosition( time ){

		return parseInt( time / unit * unitLength );
	}

	function positionToTime( left ){

		return parseInt( left / unitLength * unit * 1000 ) / 1000	//minimum 1 mileseconds
	}

	// 监视任何对象状态的变化，自动加入关键帧
	function autoAddKeyframe(objectName, query, type, value){

		var trackName = objectName+'.'+query;

		var track = findTrack( trackName );
		if( ! track){

			track = new Backbone.Model({
				name : trackName,
				objectName : objectName,
				query : query,
				type : type,
				keypoints : new Backbone.Collection
			})
			// add a new animation track	
			tracks.push(track);
		}
		var keyframe = findKeyframe( timeNow );
		if( ! keyframe ){
			keyframe = new Backbone.Model({
				time : timeNow,
				keypoints : new Backbone.Collection
			})
			keyframes.push( keyframe );
		}

		//find keypoints;
		var keypoint = findKeypoint( track.cid, keyframe.cid );
		if( ! keypoint ){
			keypoint = new Backbone.Model( {
				trackId : track.cid,
				keyframeId : keyframe.cid
			})
			keypoints.push( keypoint );
		}
		keypoint.set('value', value);
	}

	function findTrack( trackName ){

		return tracks.where({ name : trackName})[0];
	}

	function findKeyframe( time ){

		return keyframes.where( { time : time })[0];
	}

	function findKeypoint( trackId, keyframeId ){

		return keypoints.where( { trackId : trackId, keyframeId : keyframeId })[0];
	}

	function addTrack( trackName ){


		var $prop = $( '<li class="property">' + trackName + '</li>' );
		var $track = $('<li class="track"></li>');
		$track.data('name', trackName);
		$prop.data('name', trackName);

		$('#AnimationPropertyList').append( $prop );
		$('#AnimationTrackList').append( $track );

		//hash color;
		var key = trackName.substr( 0, trackName.lastIndexOf('.') );
		var hashColor = trackColorHashMap[ key ];
		if(  ! hashColor ){
			hashColor = GooJS.Util.HSV2RGB(Math.random()*360, 1.0, 0.5);
			trackColorHashMap[ key ] = hashColor;
		}
		$prop.css('border-left-color', hashColor );

	}


	function addKeypoint( trackId, keyframeId, value ){

		// keypoint-snap is for the snap when drag keyframeHandle
		var $keypoint = $('<div class="keypoint"><div class="keypoint-snap"></div></div>')

		var track = tracks.getByCid( trackId ),
			trackName = track.get('name');

		var keyframe = keyframes.getByCid( keyframeId ),
			time = keyframe.get('time');

		$track = null;

		// todo jquery 能不能根据data属性寻找
		$('#AnimationTrackList').children('li').each(function(){
			if( $(this).data('name') == trackName ){
				$track = $(this);
			}
		})
		if( $track ){

			$track.append( $keypoint );
			$keypoint.css('left', time / unit * unitLength );

			// add color
			var key = trackName.substr( 0, trackName.lastIndexOf('.') );
			$keypoint.css('background-color', trackColorHashMap[ key ] );
		}
	}

	function removeTrack( trackName ){

	}

	function removeKeyframe(){

	}

	function play(){

		// nla 
		var trackControlsList = [];

		var maxTime = 0;

		tracks.forEach(function( track, index ){

			var trackControls = generateAnimationControls( track );
			trackControlsList.push( trackControls );

			if( _.last( trackControls ).time > maxTime ){

				maxTime = _.last( trackControls ).time;
			}
		} )

		if( playInterval ){
			
			clearInterval( playInterval )
		}

		playInterval = setInterval( function( ){

			if( timeNow >= maxTime ){

				clearInterval( playInterval );
				return;
			}

			_.each( trackControlsList, function( trackControls, index ){

				var point = getPointLinear( timeNow, trackControls );

				if( point != false){
					
					var value = point.value,
						track = tracks.at(index),
						objectName = track.get('objectName'),
						query = track.get('query'),
						type = track.get('type');

					hub.trigger('update:'+type, objectName, query, value, true);
				}
			} )
			
			timeNow += 0.02;
			if( timeNow >= maxTime){
				timeNow = maxTime;
			}

			moveTo( timeNow );
		}, 20 );
	}

	function replay(){

		timeNow = 0;

		play();
	}

	// for console test
	window.play = play;
	window.replay = replay;

	function generateAnimationControls( track ){

		var keypoints = track.get( 'keypoints');

		var controls = [];

		keypoints.forEach(function(kp){

			var keyframe = keyframes.getByCid( kp.get('keyframeId') );
			var time = keyframe.get('time'),
				value = kp.get('value');

			controls.push({
				time : time,
				value : value
			});
		})

		controls = _.sortBy( controls, function(item){ return item.time } );

		return controls;
	}

	function getPointLinear( time, array ){
		// 超出时间轴
		if( time < _.first( array ).time ){
			return false;
		}
		for( var i = 0; i < array.length-1; i++){
			
			if( time >= array[ i ].time && time <= array[ i+1 ].time ){

				var value = interpolateLinear( array[ i ], array[ i+1 ], time)
			
				return { time : time, value : value };
			}
		}
		return false;
	}

	function interpolateLinear( prev, next, at){
		// 非数值类型不能插值
		if( ! _.isNumber(prev.value) ){

			value = prev.value;
		}

		var percent = (at - prev.time)/(next.time - prev.time);

		value = prev.value + (next.value-prev.value)*percent;

		return value;
	}

	var template = '\
		<div class="column-1">\
			<div id="AnimationControl">\
				<div class="prev" title="prev frame"></div>\
				<div class="start-pause" title="start/pause"></div>\
				<div class="next" title="next frame"></div>\
				<div class="record" title="record change"></div>\
			</div>\
			<div id="AnimationProperties">\
				<ul id="AnimationPropertyList">\
				</ul>\
			</div>\
		</div>\
		<div class="column-2">\
		</div>\
	';

	var timelineTemplate = '\
			<div id="AnimationTimeline">\
				<canvas class="timeline-scale" height="20" width="2000" />\
			</div>\
			<div id="AnimationTracks">\
				<ul id="AnimationTrackList">\
				</ul>\
			</div>\
			<div id="KeyframeHandle">\
				<div class="keyframeTime"></div>\
				<div class="slider"></div>\
				<div class="line"></div>\
			</div>\
		';

	function drawTimelineScale(unit, unitLength, canvasElem){

		var canvas = GooJS.create( canvasElem );

		var width = canvasElem.width,
			height = canvasElem.height;

		var count = Math.floor( width / unitLength ),
			style = new GooJS.Style({
				strokeStyle : '#999',
				fillStyle : '#999',
				lineWidth : 1
			})

		for( var i = 0; i < count; i++){

			var line = new GooJS.Line({
				start : [0, 0],
				end : [0, height],
				style : style
			})

			for( var j = 1; j < 5; j++){
				var subline = new GooJS.Line({
					start : [0, 0],
					end : [0, height/3],
					style : style
				})
				line.addElement(subline);
				subline.translate( unitLength /5*j, 0 );
			}

			var text = new GooJS.Text({
				text : parseInt( unit * i * 1000 )/1000,
				start : [4, height-3],
				font : '12px Arial',
				stroke : false,
				fill : true,
				style : style
			})
			line.addElement( text );
			// http://stackoverflow.com/questions/7607272/incorrect-display-linewidth-1-at-html5-canvas
			// Always add 0.5 pixel to the position of your line to prevent the anti-aliasing.!!
			line.translate( unitLength * i+0.5, 0);

			canvas.addElement( line );
		}
		canvas.render();
	}

	return {
		getInstance : getInstance
	}
})
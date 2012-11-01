/*global Element */
(function( window, document ) {
	'use strict';

	var keyboardAllowed = typeof Element !== 'undefined' && 'ALLOW_KEYBOARD_INPUT' in Element, // IE6 throws without typeof check

		fn = (function() {
			var fnMap = [
				[
					'requestFullscreen',
					'exitFullscreen',
					'fullscreenchange',
					'fullscreen',
					'fullscreenElement',
					'fullscreenerror'
				],
				[
					'webkitRequestFullScreen',
					'webkitCancelFullScreen',
					'webkitfullscreenchange',
					'webkitIsFullScreen',
					'webkitCurrentFullScreenElement',
					'webkitfullscreenerror'

				],
				[
					'mozRequestFullScreen',
					'mozCancelFullScreen',
					'mozfullscreenchange',
					'mozFullScreen',
					'mozFullScreenElement',
					'mozfullscreenerror'
				]
			],
			i = 0,
			l = fnMap.length,
			ret = {},
			val,
			valLength;

			for ( ; i < l; i++ ) {
				val = fnMap[ i ];
				if ( val && val[1] in document ) {
					for ( i = 0, valLength = val.length; i < valLength; i++ ) {
						ret[ fnMap[0][ i ] ] = val[ i ];
					}
					return ret;
				}
			}
			return false;
		})(),

		screenfull = {
			isFullscreen: document[ fn.fullscreen ],
			element: document[ fn.fullscreenElement ],

			request: function( elem ) {
				var request = fn.requestFullscreen;

				elem = elem || document.documentElement;

				// Work around Safari 5.1 bug: reports support for
				// keyboard in fullscreen even though it doesn't.
				// Browser sniffing, since the alternative with
				// setTimeout is even worse
				if ( /5\.1[\.\d]* Safari/.test( navigator.userAgent ) ) {
					elem[ request ]();
				} else {
					elem[ request ]( keyboardAllowed && Element.ALLOW_KEYBOARD_INPUT );
				}
			},

			exit: function() {
				document[ fn.exitFullscreen ]();
			},

			toggle: function( elem ) {
				if ( this.isFullscreen ) {
					this.exit();
					//++
					document.getElementById('logopic').width = 100;
					document.getElementById('screenpic').src = 'img/fullscreen_2.png';
					document.getElementById('video_pic').width = 28;
					document.getElementById('rotate_pic').width = 28;
					document.getElementById('eye_pic').width = 28;
					document.getElementById('action').className = 'action';
					//document.getElementById('action').style.margin-right = -240;
				} else {
					this.request( elem );
					//++
					document.getElementById('logopic').width = 160;
					document.getElementById('screenpic').src = 'img/exitscreen_2.png';
					document.getElementById('video_pic').width = 54;
					document.getElementById('rotate_pic').width = 54;
					document.getElementById('eye_pic').width = 54;
					document.getElementById('action').className = 'action_full';
					//document.getElementById('action').style.margin-right = -220;
				}
			},

			onchange: function() {},
			onerror: function() {}
		};

	if ( !fn ) {
		window.screenfull = null;
		return;
	}

	document.addEventListener( fn.fullscreenchange, function( e ) {
		screenfull.isFullscreen = document[ fn.fullscreen ];
		screenfull.element = document[ fn.fullscreenElement ];
		screenfull.onchange.call( screenfull, e );
	});

	document.addEventListener( fn.fullscreenerror, function( e ) {
		screenfull.onerror.call( screenfull, e );
	});

	window.screenfull = screenfull;

})( window, document );
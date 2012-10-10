(function(){

	var libPath = 'lib/';

	$LAB.setOptions({'BasePath':libPath})
			.script('sea.js')
			.script('THREE.min.js')
			.script('jquery.min.js')
			.script('zip/zip.js')
			.script('zip/mime-types.js')
			.script('underscore.js')
			.script('Goo.v2.js')
			.script('Morphling.js')
			.wait( boot )

	function boot(){

		zip.workerScriptsPath = 'lib/zip/';

		seajs.use(['./runtime'], function(){
			seajs.use('./app');
		})
	}
})()
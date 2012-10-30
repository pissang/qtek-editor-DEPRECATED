// var video = document.createElement('video');
// 			video.autoplay = true;
// 			var tex = new THREE.Texture(video);
// 			tex.minFilter = THREE.LinearFilter;
// 			tex.magFilter = THREE.LinearFilter;
// 			var node = new Node('video'+slots['video'], tex, self);

// 			self.$container.append(node.view.$el);
// 			node.view.$el.css({
// 				left : 200,
// 				top : 200
// 			});
// 			self.nodes['video'+slots['video']] = node;
// 			slots['video']++;

// 			node.beforeRender = function(){

// 				this.target.needsUpdate = true;
// 			}

// 			// use camera
// 			if(navigator.webkitGetUserMedia){
// 				navigator.webkitGetUserMedia({video : true}, 
// 					function(stream){
// 						video.src = webkitURL.createObjectURL(stream)
// 					}, function(){
// 						alert('could not connect stream');
// 					})
// 			}
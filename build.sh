#!/bin/sh

#use spm to build core code
#https://github.com/seajs/spm
cd static/js/Core
spm build

cd ../../
[ -d ../static-dist ] || mkdir ../static-dist/
[ -d ../static-dist/css ] || mkdir ../static-dist/css/
[ -d ../static-dist/js ] || mkdir ../static-dist/js/
[ -d ../static-dist/js/lib ] || mkdir ../static-dist/js/lib/

cat css/*.css > ../static-dist/css/main.css

cp -rf js/Modules ../static-dist/js/

cp -f js/lib/LAB.min.js ../static-dist/js/lib/LAB.min.js

[ -d ../static-dist/js/lib/zip ] || mkdir ../static-dist/js/lib/zip/
cp -f js/lib/zip/inflate.js ../static-dist/js/lib/zip/inflate.js
cp -f js/lib/zip/deflate.js ../static-dist/js/lib/zip/deflate.js

cat js/lib/sea.js\
	js/lib/three.min.js\
	js/lib/loader/ColladaLoader.js\
	js/lib/jquery.min.js\
	js/lib/jquery.mousewheel.js\
	js/lib/jquery-ui.min.js\
	js/lib/spectrum.js\
	js/lib/jquery.layout.min.js\
	js/lib/underscore.js\
	js/lib/backbone.js\
	js/lib/rivets.js\
	js/lib/codemirror/codemirror.js\
	js/lib/codemirror/javascript.js\
	js/lib/zip/zip.js\
	js/lib/zip/mime-types.js\
	js/lib/PostProcessing.js\
	js/lib/Goo.v2.js\
	> ../static-dist/js/lib/lib.js

cp -f js/boot-dist.js ../static-dist/js/boot.js
cp -f js/app.js ../static-dist/js/app.js

cp -rf img ../static-dist/
cp -f index-dist.html ../static-dist/index.html
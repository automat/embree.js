D R A F T

# embree.js

An objectified wrapper around the Intel embree 2 renderer cli.
Although intended to be used with a custom renderer, it fully supports 
Intel´s example renderer (https://github.com/embree/embree-renderer).
embree.js is mainly used in combination with tools for generating geometry and
used as an 'injected' renderer. 

## Installation

When used with the embree example renderer, download the binaries according to 
your system specs from http://embree.github.io/renderer.html, and move them 
to lib/

Afterwards link embree.js as a local module.
    
    npm link 

    

## Sample

    var embree = require('embree');
    
    var scene = new embree.Scene();
    
    scene.camera.position = [1000,1000,1000];
    
    var sphere;
    for(var i = 0; i < 100; ++i){
        sphere = new Sphere([(-1 + Math.random() * 2) * 800,
                             (-1 + Math.random() * 2) * 800,
                             (-1 + Math.random() * 2) * 800)]);
    }
    
    var opts = {
        width : 800,
        height : 600
    }
    
    embree.render(scene,opts);
    
## Documentation
    
Wiki
D R A F T

# embree.js

An object oriented wrapper around the cli introduced by Intel Embree 2 
sample renderer. Although originally intended to be used with a custom
version of the render it is fully usable with the example ray tracing kernels
implementation (https://github.com/embree/embree-renderer)
Embree.js is used in combination with tools for generating geometry
and used a an alternative render target. (eg. develop in webgl, render in embree.js)


## Installation

When used with the embree example renderer, download the binaries according to 
your system specifications from http://embree.github.io/renderer.html, and move them 
to lib/

Afterwards link embree.js as a local module.
    
    npm link 
    

## Example - Basic Setup

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
   
    
## Example - Materials & Lights    
    
## Documentation
    
Wiki
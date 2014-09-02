var embree = require('embree');
var Sphere = embree.Sphere;

var materials =  [];
materials.push(new embree.MaterialDielectric());
materials.push(new embree.MaterialBrushedMetal());
materials.push(new embree.MaterialPlastic([0,0,1]));

materials.push(new embree.MaterialPlastic([1,0,1]));
//materials.push(new embree.MaterialMetal(null,[5.0,0.45,1.50],[3.06,2.40,1.88],0.005));
//materials.push(new embree.MaterialMatteTextured());
//materials.push(new embree.MaterialThinDielectric());
//materials.push(new embree.MaterialBrushedMetal());
//materials.push(new embree.MaterialMetal());
//materials.push(new embree.MaterialDielectric());
//materials.push(new embree.MaterialMirror());
//materials.push(new embree.MaterialVelvet());
//materials.push(new embree.MaterialMetallicPaint());


var scene = new embree.Scene();
var camera = scene.camera;
camera.position = [400,400,400];
camera.radius = 10;


var numX = 30,
    numY = 30;
var size = 3000;
var numX_1 = numX - 1,
    numY_1 = numY - 1;
var spheres = new Array(numX * numY);
var sphere;

//scene.add(new embree.Disk([0,-100,0],1,300));

for(var i = 0; i < numY; ++i)for(var j = 0; j < numX; ++j){
    sphere = spheres[i + j * numY] =   new Sphere();
    sphere.position[0] = (-0.5 + i / numX_1) * size;
    sphere.position[1] = (-1 + Math.random() * 2)  * 3000;
    sphere.position[2] = (-0.5 + j / numY_1) * size;
    sphere.motion[1] = Math.random() * 10;
    //sphere.motion[1] = Math.sin(i * j * Math.PI) * 100;
    sphere.radius = 100 + Math.random() * 40;
    sphere.material = materials[(i + j * numY)% materials.length];
    //sphere.radius = 100;
    scene.objects.push(sphere);
}




embree.raytrace(scene,{
    //keepSceneFiles : false,
    //spp : 0
});

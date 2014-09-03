var spawn = require('child_process').spawn,
    path = require('path'),
    fs = require('fs');

const RENDERER_DEBUG = 'debug',
      RENDERER_PATH_TRACER = 'pathtracer';


////////////////////////////////////////////////////////////////////////////////////////////////////////
//  M A T E R I A L
////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Implements a diffuse material.
 * @param {number[]} [reflectance] Diffuse reflectance of the surface. The range is form 0 (black) to 1 (white=
 * @constructor
 */

function MaterialMatte(reflectance){
    this.reflectance = reflectance || [1.0,1.0,1.0];

}

/**
 * Implements a plastic material. A dielectric layer over a diffuse
 * surface is modeled through a dieletric layer BRDF for the
 * covered diffuse part, and a microfacet BRDF for the rough
 * dielectric surface.
 * @param {number[]} [pigmentColor] - Color of the diffuse layer
 * @param {Number} [eta] - Refraction index of the dielectric layer
 * @param {Number} [roughness] - Roughness parameter. The range goes from 0 (specular) to 1 (diffuse)
 * @constructor
 */

function MaterialPlastic(pigmentColor,eta,roughness){
    this.pigmentColor = pigmentColor || [1,1,1] ;
    this.eta = eta === undefined ? 1.4 : eta || 0;
    this.roughness = roughness === undefined ? 0.01 : roughness || 0;
}

/**
 * Implements a dielectric material such as glass.
 * @param {Number} [etaOutside] - Reflection component for inside to outside transition.
 * @param {Number} [etaInside] - Reflection component for outside to inside transition.
 * @param {number[]} [transmissionOutside] - Transmission component for inside to outside transition.
 * @param {number[]} [transmission] - Transmission component for outside to inside transition.
 * @constructor
 */

function MaterialDielectric(etaOutside,etaInside,transmissionOutside,transmission){
    this.etaOutside = etaOutside === undefined ? 1.0 : etaOutside || 0;
    this.etaInside = etaInside === undefined ? 1.4 : etaInside || 0;
    this.transmissionOutside =  transmissionOutside || [1,1,1,1];
    this.transmission = transmission || [1,1,1,1];
}

/**
 * Implements a thin dielectricum material. The model uses a
 * dielectric reflection BRDF and thin dielectric transmission
 * BRDF.
 * @param {number[]} [transmission] - Transmission coefficient of material.
 * @param {Number} [eta] - Refraction index of material.
 * @param {Number} [thickness] - Thickness of material layer.
 * @constructor
 */

function MaterialThinDielectric(transmission,eta,thickness){
    this.transmission = transmission || [1,1,1];
    this.eta = eta === undefined ? 1.4 : eta || 0;
    this.thickness = thickness === undefined ? 0.1 : thickness || 0;
}

/**
 * Implements a mirror material. The reflected light can be
 *  modulated with a mirror reflectivity.
 * @param {number[]} [reflectance] -  Reflectivity of the mirror
 * @constructor
 */

function MaterialMirror(reflectance) {
    this.reflectance = reflectance || [1,1,1];
}


/**
 * Implements a rough metal material. The metal is modelled by a
 * microfacet BRDF with a fresnel term for metals and a power
 * cosine distribution for different roughness of the material.
 * @param {number[]} [shadeColor] - Reflectivity of the metal
 * @param {number[]} [eta] - Real part of refraction index
 * @param {number[]} [k] - Imaginary part of refraction index
 * @param {Number}[roughness] - Roughness parameter. The range goes from 0 (specular) to 1 (diffuse)
 * @constructor
 */

function MaterialMetal(shadeColor,eta,k,roughness){
    this.shadeColor = shadeColor ||[1,1,1];
    this.eta = eta || [1.4,1.4,1.4];
    this.k = k || [0,0,0];
    this.roughness = roughness == undefined ? 0.01 : roughness || 0;
}

/**
 * Implements a brushed metal material. The metal is modelled by a
 * microfacet BRDF with a fresnel term for metals and a power
 * cosine distribution for different roughness of the material.
 * @param {number[]} [reflectance] - Reflectivity of the metal
 * @param {number[]} [eta] - Real part of refraction index
 * @param {number[]} [k] - Imaginary part of refraction index
 * @param {Number} [roughnessX] - Roughness parameter in X direction. The range goes from 0 (specular) to 1 (diffuse).
 * @param {Number} [roughnessY] - Roughness parameter in Y direction. The range goes from 0 (specular) to 1 (diffuse).
 * @constructor
 */

function MaterialBrushedMetal(reflectance,eta,k,roughnessX,roughnessY){
    this.reflectance = reflectance || [1,1,1];
    this.eta         = eta || [1.4,1.4,1.4];
    this.k           = k || [0,0,0];
    this.roughnessX  = roughnessX === undefined ? 0.01 : roughnessX || 0;
    this.roughnessY  = roughnessY === undefined ? 0.01 : roughnessY || 0;
}

/**
 * Implements a car paint BRDF. Models a dielectric layer over a
 * diffuse ground layer. Additionally the ground layer may contain
 * metallic glitter.
 * @param {number[]} [shadeColor]
 * @param {number[]} [glitterColor]
 * @param {Number} [glitterSpread]
 * @param {Number} [eta]
 * @constructor
 */

function MaterialMetallicPaint(shadeColor,glitterColor,glitterSpread,eta){
    this.shadeColor = shadeColor || [1,1,1];
    this.glitterColor = glitterColor || [0,0,0];
    this.glitterSpread = glitterSpread === undefined ? 1.0 : glitterSpread || 0;
    this.eta = eta === undefined ? 1.4 : eta || 0;
}

/**
 * Implements a diffuse and textured material.
 * @param {number[]} [offset] - Offset for texture coordinates.
 * @param {number[]} [scale] - Scaling for texture coordinates.
 * @param {String} [texture] - Texture mapped to the surface.
 * @constructor
 */

function MaterialMatteTextured(offset,scale,texture){
    this.s0 = offset || [0,0];
    this.ds = scale || [1,1];
    this.Kd = texture || (__dirname + '/../assets/ash_uvgrid01.jpg');
}


/**
 * Implements a velvet material
 * @param {number[]} [reflectance] - Diffuse reflectance of the surface. The range is from 0 (black) to 1 (white).
 * @param {Number} [backScattering] - Amount of back scattering. The range is from 0 (no back scattering) to inf (maximum back scattering).
 * @param {number[]} [horizonScatteringColor] - Color of horizon scattering.
 * @param {Number} [horizonScatteringFallOff] - Fall-off of horizon scattering.
 * @constructor
 */

function MaterialVelvet(reflectance,backScattering,horizonScatteringColor,horizonScatteringFallOff){
    this.reflectance = reflectance || [1,1,1];
    this.backScattering = backScattering || 0;
    this.horizonScatteringColor = horizonScatteringColor || [1,1,1];
    this.horizonScatteringFallOff =horizonScatteringFallOff || 0;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////
//  S H A P E
////////////////////////////////////////////////////////////////////////////////////////////////////////

function Shape(material){
    this.material = material || new MaterialBrushedMetal();
}

/**
 * Implements a disk shape.
 * @param {Array} [position] - center of disk
 * @param {Number} [height] - height of the cone
 * @param {Number} [radius] - radius of disk
 * @param {Number} [numTriangles] - triangulation amount
 * @param {Material} [material] - material of disk
 * @constructor
 */

function Disk(position,height,radius,numTriangles,material){
    Shape.call(this,material);
    this.position = position || [0,0,0];
    this.height = height === undefined ? 0 : height;
    this.radius = radius === undefined ? 50 : radius;
    this.numTriangles = numTriangles === undefined ? 50 : numTriangles;
}
Disk.prototype = Object.create(Shape.prototype);
Disk.constructor = Disk;

/**
 * Implements a sphere shape.
 * @param {Array} [position] - center of sphere
 * @param {Array} [motion] - motion of sphere with time
 * @param {Number} [radius] - radius of sphere
 * @param {Number} [numTheta] - triangulation amount from north to south pole
 * @param {Number} [numPhi] - triangulation amount around the sphere
 * @param {Material} [material] - material of sphere
 * @constructor
 */

function Sphere(position,motion,radius,numTheta,numPhi, material){
    Shape.call(this,material);
    this.position = position || [0,0,0];
    this.motion = motion || [0,0,0];
    this.radius = radius === undefined ? 100 : radius;
    this.numTheta = numTheta === undefined ? 50 : numTheta;
    this.numPhi = numPhi === undefined ? 50 : numPhi;
}
Sphere.prototype = Object.create(Shape.prototype);
Sphere.constructor = Sphere;

/**
 * Implements a triangle mesh. The mesh supports optional vertex normals and texture coordinates.
 * @param {Array} positions - position arrays
 * @param {Array} motions - motion array
 * @param {Array} normals - normal array (can be empty)
 * @param {Array} texcoords - texcoords (can be empty)
 * @param {Array} triangles - triangle indices array
 * @param material
 * @constructor
 */

function TriangleMesh(positions, motions, normals, texcoords, triangles, material) {
    Shape.call(this,material);
    this.positions = positions;
    this.motions = motions;
    this.normals = normals;
    this.texcoords = texcoords;
    this.triangles = triangles;
}
TriangleMesh.prototype = Object.create(Shape.prototype);
TriangleMesh.constructor = TriangleMesh;


////////////////////////////////////////////////////////////////////////////////////////////////////////
//  T R A N S F O R M
////////////////////////////////////////////////////////////////////////////////////////////////////////

function TransformBegin(){}
function TransformEnd(){}

////////////////////////////////////////////////////////////////////////////////////////////////////////
//  L I G H T
////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Implements an ambient light. An ambient light behaves like a
 * uniform environment map.
 * @param {number[]} [intensity] - Radiant intensity
 * @constructor
 */

function AmbientLight(intensity){
    this.intensity = intensity || [1,1,1];
}

/**
 * Implements a point light source
 * @param {number[]} [intensity] - Radiant intensity
 * @param {number[]} [position] - Position of the point light
 * @constructor
 */

function PointLight(intensity,position){
    this.position = position || [300,300,300];
    this.intensity = intensity || [50,50,50];
}

/**
 * Implements a distant light.  The distant light illuminates from
 * infinity from a cone of directions. This simulates the light
 * field of a far away big object like the sun.
 * @param {number[]} [intensity] - Radiant intensity
 * @param {number[]} [direction] - Negative light direction
 * @param {number} [halfangle] - Half illumination angle
 * @constructor
 */

function DistantLight(intensity,direction,halfangle){
    this.direction = direction || [-1,0,0];
    this.intensity = intensity || [50,50,50];
    this.halfangle = halfangle === undefined ? 180 : halfangle || 0;
}

/**
 * Implements a triangle shaped area light.
 * @param {number[]} [intensity] - Radiant intensity
 * @param {number[]} [p] - First vertex of the triangle
 * @param {number[]} [u] - Second vertex of the triangle
 * @param {number[]} [v] - Third vertex of the triangle
 * @constructor
 */

function TriangleLight(intensity,p,u,v){
    this.p0 = p || [0,400,0];
    this.p1 = u || [0,0,100];
    this.p2 = v || [100,0,0];
    this.intensity = intensity || [50,50,50];
}

/**
 * Implements a quad shaped area light.
 * @param {number[]} [intensity]
 * @param {number[]} [position] -
 * @param {number[]} [u]
 * @param {number[]} [v]
 * @constructor
 */

function QuadLight(intensity,position,u,v){
    this.position = position || [0, 400, 0];
    this.u = u || [100,0,0];
    this.v = v || [0,0,100];
    this.intensity = intensity || [50,50,50];
}

/**
 * Implements a texture mapped environment light.
 * @param {number[]} intensity - Radiant intensity
 * @param {string} image - The image mapped to the environment
 * @constructor
 */

function HDRILight(intensity,image){
    this.intensity = intensity;
    this.image = image;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
//  C A M E R A
////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Implements the pinhole camera model.
 * @constructor
 */

function CameraPinhole(){
    /**
     * Position
     * @type {number[]}
     */
    this.position = [300,300,300];
    /**
     * Target
     * @type {number[]}
     */
    this.target = [0,0,0];
    /**
     * Up vector
     * @type {number[]}
     */
    this.up = [0,1,0];
    /**
     * Field of view
     * @type {number}
     */
    this.fov = 64.0;

}

/**
 * Implements a depth of field camera model.
 * @constructor
 */

function CameraDOF(){
    CameraPinhole.apply(this);
    /**
     * Radius of the lens
     * @type {number}
     */
    this.radius = 0;
}

CameraDOF.prototype = Object.create(CameraPinhole.prototype);
CameraDOF.constructor = CameraDOF;


////////////////////////////////////////////////////////////////////////////////////////////////////////
//  S C E N E
////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * The scene to be rendered
 * @constructor
 */
function Scene(){
    /**
     * Reference to the camera
     * @type {CameraPinhole || CameraDOF}
     */
    this.camera = new CameraPinhole();
    /**
     * Objects to be rendered.
     * @type {Array}
     */
    this._objects = [];
    this._transformsRef = [];

    this._numObjects = 0;

    /**
     * Lights used.
     * @type {Array}
     */
    this.lights = [];

    this.backplateImage = '';
}

Scene.prototype.addLight = function(light){

};

Scene.prototype.removeLight = function(light){

};

Scene.prototype.addObject = function(obj){
    var objs = this._objects;
    if(this._numObjects > 0){
        var i = -1, l = objs.length;
        while(++i < l){
            if(objs[i] == obj){
                return;
            }
        }
    }
    objs.push(obj);
    this._numObjects++;
};

Scene.prototype.removeObject = function(obj){
    var numObjects = this._numObjects;
    if(numObjects == 0){
        return;
    }
    var objs = this._objects;
    var i = -1, l = objs.length;
    while(++i < l){
        if(objs[i] == obj ){
            objs.splice(i,1);
            this._numObjects = Math.max(numObjects - 1,0);
            var refs = this._transformsRef,ref;
            var j = -1, k = refs.length;
            while(++j < k){
                ref = refs[j];
                if(ref > i){
                    refs[j] = Math.max(ref - 1,0);
                }
            }
            return;
        }
    }
};

/**
 * Push a new transform on the transform stack
 */

Scene.prototype.push = function(){
    var objs = this._objects;
    objs.push(new TransformBegin());
    this._transformsRef.push(objs.length - 1);
};

Scene.prototype.pop = function(){
    var transformsRef = this._transformsRef;
    if(transformsRef.length == 0){
        return;
    }
    this._objects.push(new TransformEnd());
    transformsRef.pop();
};

/**
 * Translate by xyz.
 * @param x
 * @param y
 * @param z
 */

Scene.prototype.translate = function(x,y,z){
    var transformsRef = this._transformsRef;
    if(transformsRef.length == 0){
        return;
    }
    this._objects[transformsRef[transformsRef.length - 1]].translate = [x,y,z];
};

/**
 * Scale by xyz.
 * @param x
 * @param y
 * @param z
 */

Scene.prototype.scale = function(x,y,z){
    var transformsRef = this._transformsRef;
    if(transformsRef.length == 0){
        return;
    }
    this._objects[transformsRef[transformsRef.length - 1]].scale = [x,y,z];
};

/**
 * Rotate by xyz.
 * @param x
 * @param y
 * @param z
 */

Scene.prototype.rotate = function(x,y,z){
    var transformsRef = this._transformsRef;
    if(transformsRef.length == 0){
        return;
    }
    var transform = this._objects[transformsRef[transformsRef.length - 1]];
    transform.rotate_x = x || 0;
    transform.rotate_y = y || 0;
    transform.rotate_z = z || 0;
};

/**
 * Rotate by angle and axis.
 * @param rotate
 * @param axis
 */

Scene.prototype.rotateAxis = function(rotate,axis){
    var transformsRef = this._transformsRef;
    if(transformsRef.length == 0){
        return;
    }
    var transform = this._objects[transformsRef[transformsRef.length - 1]];
    transform.rotate = rotate;
    transform.axis = axis;
};




////////////////////////////////////////////////////////////////////////////////////////////////////////
//  O B J E C T - M O D E L
////////////////////////////////////////////////////////////////////////////////////////////////////////

function parseProp(prop){
    if( typeof prop === 'string'){
        prop = '"'+prop+'"';
    }
    if(prop instanceof Array){
        prop = prop.toString().replace(/,/g,' ');
    }
    return prop;
}

function addArg(){
    function parseArg(arg){
        if(arg instanceof Array){
            arg = arg.toString().replace(/,/g,' ');
        }
        return arg;
    }
    var argl = arguments.length;
    if(argl < 2){
        return '';
    } else if(argl == 2 && typeof arguments[1] === 'boolean' ){
        return arguments[1] ? arguments[0] + '\n' : '';
    }
    var str = arguments[0] + ' ';
    var i = 0;while(++i < argl){
        str += ' ' + parseArg(arguments[i]);
    }
    return str + '\n';
}

function writeXmlObj(obj, prop){
    var str = '';
    if( obj == 'bool1' ||
        obj == 'bool2' ||
        obj == 'bool3' ||
        obj == 'bool4' ||
        obj == 'int1' ||
        obj == 'int2' ||
        obj == 'int3' ||
        obj == 'int4' ||
        obj == 'float' ||
        obj == 'float1' ||
        obj == 'float2' ||
        obj == 'float3' ||
        obj == 'float4' ||
        obj == 'texture'){
        str += '<'+obj+ ' name=' + parseProp(prop.name) + '>' + parseProp(prop.value);
    } else {
        var p,p_;
        str += '<' + obj + '>';
        if((prop !== null) && (typeof prop === 'object') && !(prop instanceof Array)){
            for(p in prop){
                str += writeXmlObj(p,prop[p]);
            }
        } else if(prop instanceof Array){
            if( typeof prop[0] === 'number' || typeof prop[0] === 'string'){
                str += parseProp(prop);
            } else if(typeof prop[0] === 'object'){
                for(p in prop)for(p_ in prop[p]){
                    str += writeXmlObj(p_,prop[p][p_]);
                }
            }
        } else {
            str += parseProp(prop);
        }
    }
    return str + '</' + obj + '>';
}

//based on https://gist.github.com/sente/1083506
function formatXml(xml) {
    var out = '';
    var reg  = /(>)(<)(\/*)/g,
        reg1 = /.+<\/\w[^>]*>$/,
        reg2 = /^<\/\w/,
        reg3 = /^<\w[^>]*[^\/]>.*$/;

    xml = xml.toString().replace(reg, '$1\r\n$2$3');
    var pad = 0;
    var nodes = xml.split('\r\n');
    var node, indent, padding;
    for(var n in nodes) {
        node = nodes[n];
        indent = 0;
        if (node.match(reg1)) {
            indent = 0;
        } else if (node.match(reg2)) {
            if (pad !== 0) {
                pad -= 1;
            }
        } else if (node.match(reg3)) {
            indent = 1;
        } else {
            indent = 0;
        }
        padding = '';
        for (var i = 0; i < pad; i++) {
            padding += '  ';
        }
        out += padding + node + '\r\n';
        pad += indent;
    }
    return out;
}

/*
 * Errors write
 */
function ErrorObjPropertyInvalid(shapeId,propertyName,value) {
    Error.apply(this);
    Error.captureStackTrace(this,ErrorObjPropertyInvalid);
    this.name = 'ErrorObjPropertyInvalid';
    this.message = 'Can´t render shape of type ' + '"' + shapeId + '", ' + propertyName +' not valid: ' + value + '.';
}
ErrorObjPropertyInvalid.prototype = Object.create(Error.prototype);
ErrorObjPropertyInvalid.constructor = ErrorObjPropertyInvalid;

function ErrorObjPropertyExpectedNotValid(shapeId,propertyName,value,valueExpected){
    Error.apply(this);
    Error.captureStackTrace(this,ErrorObjPropertyExpectedNotValid);
    this.name = 'ErrorObjPropertyExpectedNotValid';
    this.message = 'Can´t render shape of type ' + '"' + shapeId + '", ' + propertyName + ' not valid: ' + value + '. Should be: ' + valueExpected + '.';
}
ErrorObjPropertyExpectedNotValid.prototype = Object.create(Error.prototype);
ErrorObjPropertyExpectedNotValid.constructor = ErrorObjPropertyExpectedNotValid;

function ErrorObjMaterialInvalid(type){
    Error.apply(this);
    Error.captureStackTrace(this,ErrorObjMaterialInvalid);
    this.name = 'ErrorObjMaterialInvalid';
    this.message = 'Can´t render material of type "' + type + '".';
}
ErrorObjMaterialInvalid.prototype = Object.create(Error.prototype);
ErrorObjMaterialInvalid.constructor = ErrorObjMaterialInvalid;

/*
 *  Write standard embree shapes
 */

function writeObj(obj){
    var rep;
    if(obj instanceof Disk){
        rep = writeDisk(obj);
    } else if( obj instanceof Sphere){
        rep = writeSphere(obj);
    } else if( obj instanceof TriangleMesh){
        rep = writeTriangleMesh(obj);
    } else if( obj instanceof TransformBegin){
        rep = writeTransformBegin(obj);
    } else if( obj instanceof TransformEnd){
        rep = writeTransformEnd();
    }
    return rep;
}

function packMaterial(material){
    var code = material.constructor.name.substr(8);
    var obj = {code : code,
        parameters : []};
    var params = obj.parameters;
    var param;

    for(var p in material){
        param = material[p];
        if(param instanceof Array){
            switch (param.length){
                case 4:
                    params.push({
                        float4 : {
                            name : p,
                            value : param
                        }
                    });
                    break;
                case 3:
                    params.push({
                        float3 : {
                            name : p,
                            value : param
                        }
                    });
                    break;
                case 2:
                    params.push({
                        float2 : {
                            name : p,
                            value :param
                        }
                    });
                    break;
                case 1:
                    if(param === 'string'){
                        params.push({
                            texture : {
                                name : p,
                                value : param
                            }
                        });
                    }
                    break;
            }
        }

        if(typeof param === 'number'){
            params.push({
                float : {
                    name : p,
                    value : material[p]
                }
            })
        }
    }
    return obj;
}

const SHAPE_EMPTY_DESC = '';

function writeDisk(disk){
    const SHAPE_ID = 'Disk';
    if(disk.radius <= 0){
        throw new ErrorObjPropertyInvalid(SHAPE_ID,'radius',disk.radius);
    }
    if(disk.numTriangles <= 0){
        throw new ErrorObjPropertyInvalid(
            SHAPE_ID,
            'numTriangles',
            disk.numTriangles);
    }
    var obj = {};
    obj.position = disk.position;
    obj.height = disk.height;
    obj.radius = disk.radius;
    obj.numTriangles = disk.numTriangles;
    obj.material = packMaterial(disk.material);
    return writeXmlObj(SHAPE_ID,obj);
}

function writeSphere(sphere){
    const SHAPE_ID = 'Sphere';
    if(sphere.radius <= 0){
        return SHAPE_EMPTY_DESC;
    }
    if(sphere.numPhi == 0 || sphere.numPhi == 0){
        throw new ErrorObjPropertyInvalid(
            SHAPE_ID,
            'numPhi',
            sphere.numPhi);
    }
    if(sphere.numTheta == 0 || sphere.numTheta <= 0){
        throw new ErrorObjPropertyInvalid(
            SHAPE_ID,
            'numTheta',
            sphere.numTheta);
    }

    var obj = {};
    obj.position = sphere.position;
    if(!(sphere.motion[0] == 0 && sphere.motion[1] == 0 && sphere.motion[2] == 0)){
        obj.motion = sphere.motion;
    }
    obj.radius = sphere.radius;
    obj.numTheta = sphere.numTheta;
    obj.numPhi = sphere.numPhi;
    obj.material = packMaterial(sphere.material);
    return writeXmlObj('Sphere',obj);
}

function writeTriangleMesh(triangleMesh){
    const SHAPE_ID = 'TriangleMesh';
    if(!triangleMesh.positions || triangleMesh.positions.length == 0){
        throw new ErrorObjPropertyInvalid(SHAPE_ID,'positions',triangleMesh.positions);
    }
    if(!triangleMesh.triangles || triangleMesh.triangles.length == 0){
        throw new ErrorObjPropertyInvalid(SHAPE_ID,'triangles',triangleMesh.triangles);
    }

    var numPositions = triangleMesh.positions.length;
    var obj = {};
    obj.positions = triangleMesh.positions;
    if(triangleMesh.motions){
        var numMotions = triangleMesh.motions.length;
        if(numMotions != numPositions){
            throw new ErrorObjPropertyExpectedNotValid(
                SHAPE_ID,
                'motions length',
                numMotions,
                numPositions
            );
        }
        obj.motions = triangleMesh.motions;
    }
    if(triangleMesh.normals){
        var numNormals = triangleMesh.normals.length;
        if(numNormals != numPositions){
            throw new ErrorObjPropertyExpectedNotValid(
                SHAPE_ID,
                'normals length',
                numNormals,
                numPositions);
        }
        obj.normals = triangleMesh.normals;
    }
    if(triangleMesh.texcoords){
        var numTexcoords = triangleMesh.texcoords.length;
        if(numTexcoords != numPositions){
            throw new ErrorObjPropertyExpectedNotValid(
                SHAPE_ID,
                'texcoords length',
                numTexcoords,
                numPositions);
        }
        obj.texcoords = triangleMesh.texcoords;
    }
    obj.triangles = triangleMesh.triangles;
    obj.material = packMaterial(triangleMesh.material);
    return writeXmlObj(SHAPE_ID,obj);
}

function writeTransformBegin(transform){
    var str = '<Transform>';
    for(var p in transform){
        str += parseProp(transform[p]);
    }
    return str;
}

function writeTransformEnd(){
    return '</Transform>';
}

/*
 * Error scene
 */

function ErrorSceneNoObjs(){
    Error.apply(this);
    Error.captureStackTrace(this, ErrorSceneNoObjs);
    this.name = 'ErrorSceneNoObjs';
    this.message = 'The scene to be raytraced does not contain any _objects.';
}
ErrorSceneNoObjs.prototype = Object.create(Error.prototype);
ErrorSceneNoObjs.constructor = ErrorSceneNoObjs;

const SCENE_BEGIN = '<?xml version="1.0"?><scene><Group>',
      SCENE_END   = '</Group></scene>';

/*
 * Process
 */

function process_(scene){
    var objects = scene._objects,
        lights  = scene.lights;
    var len = objects.length;

    if(len == 0){
        throw new ErrorSceneNoObjs();
    }

    var xmlStr = SCENE_BEGIN;
    var i = -1, l = objects.length;
    while(++i < l){
        xmlStr += writeObj(objects[i]);
    }
    xmlStr += SCENE_END;

    var camera = scene.camera;

    var ecsStr;
    ecsStr =
        addArg('-vp',camera.position) +
        addArg('-vi',camera.target) +
        addArg('-vu',camera.up) +
        addArg('-angle',camera.fov) +
        addArg('-radius',camera.radius || false);

    i = -1; l = lights.length;
    var light, p, argstr,type;
    var argpoststr = '';
    while(++i < l){
        light = lights[i];
        type = light.constructor.name.toLowerCase();
        argstr = '';
        for(p in light){
            argstr += parseProp(light[p]) + ' ';
        }
        argstr = '-'+type + '  ' + argstr + '\n';
        if(type == 'ambientlight' || type == 'pointlight'){
            argpoststr += argstr;
        } else {
            ecsStr += argstr;
        }
    }
    ecsStr += argpoststr;

    console.log(ecsStr);

    return {xml:xmlStr,ecs:ecsStr};
}

/*
 * Process scene
 */

function render(scene,options){
    options = options || {};
    options.width                 = options.width || 800;
    options.height                = options.height || 600;
    options.fullscreen            = options.fullscreen || false;
    options.renderer              = options.renderer || RENDERER_PATH_TRACER;
    options.gamma                 = options.gamma === undefined ? 1 : options.gamma;
    options.depth                 = options.depth || 16;
    options.spp                   = options.spp || 1;
    options.logging               = options.logging || false;
    options.verbose               = options.verbose || false;
    options.spatialIndexStructure = options.spatialIndexStructure || 'triangle4';
    options.keepSceneFiles        = options.keepSceneFiles || false;
    options.renderToImage         = options.renderToImage || false;
    options.renderToImagePath     = options.renderToImagePath || null;

    scene = process_(scene);

    var rootApp    = path.dirname(require.main.filename);
    var tmpDir     = rootApp + '/.' + Date.now() + Math.random(),
        tmpXmlPath = tmpDir + '/scene.xml',
        tmpEcsPath = tmpDir + '/scene.ecs';

    fs.mkdirSync(tmpDir);

    fs.writeFileSync(tmpXmlPath,options.keepSceneFiles ? formatXml(scene.xml) : scene.xml);
    scene.ecs = addArg('-i',tmpXmlPath) +
                scene.ecs +
                addArg('-size',       options.width, options.height) +
                addArg('-renderer',   options.renderer) +
                addArg('-fullscreen', options.fullscreen) +
                addArg('-accel',      options.spatialIndexStructure) +
                addArg('-gamma',      options.gamma) +
                addArg('-depth',      options.depth) +
                addArg('-spp',        options.spp) +
                addArg('--no-logging',!options.logging) +
                addArg('-o', options.renderToImage ? (options.renderToImagePath || (rootApp + '/' + Date.now() + '.tga')) : false);

    fs.writeFileSync(tmpDir+'/scene.ecs',scene.ecs);

    function rmTemp(){
        if(options.keepSceneFiles || !fs.existsSync(tmpDir)){
           return;
        }
        fs.unlinkSync(tmpXmlPath);
        fs.unlinkSync(tmpEcsPath);
        fs.rmdirSync(tmpDir);
    }

    function logProcess(data) {
        console.log(data.toString());
    }

    var renderer = spawn(__dirname + '/../lib/renderer',['-c',tmpEcsPath]);

    renderer.stdout.on('data',logProcess);
    renderer.stderr.on('data',logProcess);
    renderer.on('exit', rmTemp);
    renderer.on('error', function(code){
        rmTemp();
        console.log('Renderer process exited with code ' + code);
    });
    renderer.on('close', function(code){
        rmTemp();
        if(code == 0 || code == null){
            return;
        }
        console.log('Renderer process exited with code ' + code);
    });
    process.on('exit',rmTemp);
    process.on('SIGINT',rmTemp)
}

/*
 *  exports
 */

module.exports = {
    MaterialBrushedMetal : MaterialBrushedMetal,
    MaterialDielectric : MaterialDielectric,
    MaterialMatte : MaterialMatte,
    MaterialMatteTextured : MaterialMatteTextured,
    MaterialMetal : MaterialMetal,
    MaterialMetallicPaint : MaterialMetallicPaint,
    MaterialMirror : MaterialMirror,
    MaterialPlastic : MaterialPlastic,
    MaterialThinDielectric : MaterialThinDielectric,
    MaterialVelvet : MaterialVelvet,

    Disk : Disk,
    Sphere : Sphere,
    TriangleMesh : TriangleMesh,

    AmbientLight : AmbientLight,
    PointLight : PointLight,
    DistantLight : DistantLight,
    TriangleLight : TriangleLight,
    QuadLight : QuadLight,
    HDRILight : HDRILight,

    ErrorObjPropertyInvalid : ErrorObjPropertyInvalid,
    ErrorObjPropertyExpectedNotValid : ErrorObjPropertyExpectedNotValid,
    ErrorObjMaterialInvalid : ErrorObjMaterialInvalid,
    NoSceneObjError : ErrorSceneNoObjs,

    RENDERER_DEBUG : RENDERER_DEBUG,
    RENDERER_PATH_TRACER : RENDERER_PATH_TRACER,

    CameraPinhole : CameraPinhole,
    CameraDOF : CameraDOF,
    Scene : Scene,
    render : render
};




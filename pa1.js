"use strict";

var gl;                 // The webgl context.

var a_coords_loc;       // Location of the a_coords attribute variable in the shader program.
var a_coords_buffer;    // Buffer to hold the values for a_coords.
var a_normal_loc;       // Location of a_normal attribute.
var a_normal_buffer;    // Buffer for a_normal.
var index_buffer;       // Buffer to hold vetex indices from model.

var u_diffuseColor;     // Locations of uniform variables in the shader program
var u_specularColor;
var u_specularExponent;
var u_lightPosition;
var u_modelview;
var u_projection;
var u_normalMatrix;    

var projection = mat4.create();          // projection matrix
var modelview;                           // modelview matrix; value comes from rotator
var normalMatrix = mat3.create();        // matrix, derived from model and view matrix, for transforming normal vectors
var rotator;                             // A TrackballRotator to implement rotation by mouse.

var lastTime = 0;
var colors = [  // RGB color arrays for diffuse and specular color values
    [1,1,1],
];

var lightPositions = [  // values for light position
  [0,0,0,1],
];

var objects = [         // Objects for display
    chair(),table(), cube(),
];

var currentModelNumber;  // contains data for the current object

function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

function translationMatrix(vector)
{
    var tx = vector[0];
    var ty = vector[1];
    var tz = vector[2];
    var matrix = [1, 0, 0, 0,
                  0, 1, 0, 0,
                  0, 0, 1, 0,
                  tx, ty, tz, 1];
    
    return matrix;
}

function scaleMatrix(vector)
{
    var sx = vector[0];
    var sy = vector[1];
    var sz = vector[2];
    var matrix = [sx, 0, 0, 0,
                  0, sy, 0, 0,
                  0, 0, sz, 0,
                  0, 0, 0, 1];
    return matrix;
}

function rotateMatrixY(angle)
{
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    var matrix = [c, 0, -s, 0,
                  0, 1, 0, 0, 
                  s, 0, c, 0, 
                  0, 0, 0, 1];
    return matrix;
}

function rotateMatrixX(angle)
{
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    var matrix = [1, 0, 0, 0,
                  0, c, -s, 0, 
                  0, s, c, 0, 
                  0, 0, 0, 1];
    return matrix;
}

function rotateMatrixZ(angle)
{
    var c = Math.cos(angle);
    var s = Math.sin(angle);
    var matrix = [c, -s, 0, 0,
                  s, c, 0, 0, 
                  0, 0, 1, 0, 
                  0, 0, 0, 1];
    return matrix;
}

function perspectiveMatrix(fov, aspect, near, far)
{
    var f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
    var rangeInv = 1.0 / (near - far);
    var pmatrix = [f/aspect, 0, 0, 0,
                   0, f, 0, 0,
                   0, 0, (near+far) * rangeInv, -1,
                   0, 0, near*far*rangeInv*2, 0];
    return pmatrix;
}

function offset(row, col)
{
    return row * 4 + col;
}

function matrixMultiplication(tmatrix, imatrix)
{
    var output = [];
    for (var row = 0; row < 4; ++row)
    {
        var n = 0;
        while (n < 4)
        {   
            var result = 0; 
            for (var col = 0; col < 4; ++col)
            {                
                result += tmatrix[offset(row, col)] * imatrix[offset(col,n)];
            }
            output.push(result);
            ++n;
        }
    }
    return output;
}

function perspective(projectionmatrix, fov, aspect, near, far
    ){

    if (document.getElementById("my_gl").checked) {
        var pmatrix = perspectiveMatrix(fov,aspect,near,far);
        projectionmatrix = matrixMultiplication(pmatrix,projectionmatrix);
        return projectionmatrix;
    }
    else {
        mat4.perspective(projectionmatrix,fov,aspect,near,far);
        return projectionmatrix;
    }  
}

function translate(inputmodel, trans_vector
    ){

    if (document.getElementById("my_gl").checked) {
        var tmatrix = translationMatrix(trans_vector);        
        inputmodel = matrixMultiplication(tmatrix, inputmodel);        
        return inputmodel;
        
    }
    else {
        mat4.translate(inputmodel, inputmodel, trans_vector);
        return inputmodel;
    }  
}

function rotate(axis, inputmodel, angle
    ){

    if (document.getElementById("my_gl").checked) {
        if (axis == "X" || axis == "x")
        {
            var rmatrix = rotateMatrixX(angle);
            inputmodel = matrixMultiplication(rmatrix, inputmodel);
            return inputmodel;
        }
        else if (axis == "Y" || axis == "y")
        {
            var rmatrix = rotateMatrixY(angle);
            inputmodel = matrixMultiplication(rmatrix, inputmodel);
            return inputmodel;
        }
        else
        {
            var rmatrix = rotateMatrixZ(angle);
            inputmodel = matrixMultiplication(rmatrix, inputmodel);
            return inputmodel;
        }
    }
    else {
        if (axis == "X" || axis == "X")
        {
            mat4.rotateX(inputmodel, inputmodel, angle);
            return inputmodel;
        }
        else if (axis == "Y" || axis == "y")
        {  
            mat4.rotateY(inputmodel, inputmodel, angle); 
            return inputmodel;
        }
        else
        {
            mat4.rotateZ(inputmodel, inputmodel, angle);
            return inputmodel;
        }
    }  

}

function scale(inputmodel, scale_vector
    ){

    if (document.getElementById("my_gl").checked) {
        var smatrix = scaleMatrix(scale_vector);
        
        inputmodel = matrixMultiplication(smatrix, inputmodel);
        return inputmodel;
    }
    else {
        mat4.scale(inputmodel, inputmodel, scale_vector);
        return inputmodel;
    } 
}



function draw() { 
    gl.clearColor(0.15,0.15,0.3,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    perspective(projection,Math.PI/5,1,10,20);   
    modelview = rotator.getViewMatrix();

    // draw the 1st chair , object[0]
    installModel(objects[0]);
    currentModelNumber = 0;
    

    modelview = scale(modelview, [2, 2, 2]);
    modelview = rotate("Y", modelview, degToRad(90));

    modelview = translate(modelview, [1.0, -1.0, 0.8]);
    
    update_uniform(modelview,projection, 0);

    modelview = translate(modelview, [-1.0, 1.0, -0.8]);
    
    modelview = rotate("Y", modelview, degToRad(-90));
    modelview = scale(modelview, [0.5, 0.5, 0.5]);
    
    // draw the 2nd chair , object[0]
    installModel(objects[0]);
    currentModelNumber = 0;
   
    modelview = scale(modelview, [2, 2, 2]);
    modelview = translate(modelview, [1.2, -1.0, 0.7]);
    
    update_uniform(modelview,projection, 0);
    
    modelview = translate(modelview, [-1.2, 1.0, -0.7]);
    modelview = scale(modelview, [0.5, 0.5, 0.5]);

    
    // draw the 3rd chair , object[0]
    installModel(objects[0]);
    currentModelNumber = 0;
    

    modelview = scale(modelview, [2, 2, 2]);
    modelview = translate(modelview, [-1.0, -1.0, -0.65]);
    modelview = rotate("Y", modelview, degToRad(180));
    
    update_uniform(modelview,projection, 0);

    modelview = rotate("Y", modelview, degToRad(-180));
    modelview = translate(modelview, [1.0, 1.0, 0.65]);
    modelview = scale(modelview, [0.5, 0.5, 0.5]);

    // draw the 4th chair , object[0]
    installModel(objects[0]);
    currentModelNumber = 0;
    
    modelview = scale(modelview, [2, 2, 2]);
    modelview = translate(modelview, [-0.5, -1.0, 1.0]);
    modelview = rotate("Y", modelview, degToRad(270));

    update_uniform(modelview,projection, 0);

    modelview = rotate("Y", modelview, degToRad(-270));
    modelview = translate(modelview, [0.5, 1.0, -1.0]);
    modelview = scale(modelview, [0.5, 0.5, 0.5]);

    // draw the Table , object[1]
    installModel(objects[1]);
    currentModelNumber = 1;
    
    modelview = scale(modelview, [2,2,2]);
    modelview = translate(modelview, [0.0, -0.5, 0.0]);   
    modelview = rotate("Y", modelview, degToRad(45));

    update_uniform(modelview,projection, 1);

    modelview = rotate("Y", modelview, degToRad(-45));
    modelview = translate(modelview, [0.0, 0.5, 0.0]);
    modelview = scale(modelview, [0.5,0.5,0.5]); 

    // draw the Cube , object[2]
    installModel(objects[2]);
    currentModelNumber = 2;
    
    modelview = translate(modelview, [0.3, -0.2, 0.0]);
    
    update_uniform(modelview,projection, 2);
    
    modelview = translate(modelview, [-0.3, 0.2, 0.0]);
}

/*
  this function assigns the computed values to the uniforms for the model, view and projection 
  transform
*/
function update_uniform(modelview,projection,currentModelNumber){

    /* Get the matrix for transforming normal vectors from the modelview matrix,
       and send matrices to the shader program*/
    mat3.normalFromMat4(normalMatrix, modelview);
    
    gl.uniformMatrix3fv(u_normalMatrix, false, normalMatrix);
    gl.uniformMatrix4fv(u_modelview, false, modelview );
    gl.uniformMatrix4fv(u_projection, false, projection );   
    gl.drawElements(gl.TRIANGLES, objects[currentModelNumber].indices.length, gl.UNSIGNED_SHORT, 0);
}



/* 
 * Called and data for the model are copied into the appropriate buffers, and the 
 * scene is drawn.
 */
function installModel(modelData) {
     gl.bindBuffer(gl.ARRAY_BUFFER, a_coords_buffer);
     gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);
     gl.vertexAttribPointer(a_coords_loc, 3, gl.FLOAT, false, 0, 0);
     gl.enableVertexAttribArray(a_coords_loc);
     gl.bindBuffer(gl.ARRAY_BUFFER, a_normal_buffer);
     gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexNormals, gl.STATIC_DRAW);
     gl.vertexAttribPointer(a_normal_loc, 3, gl.FLOAT, false, 0, 0);
     gl.enableVertexAttribArray(a_normal_loc);
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index_buffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);
}


/* Initialize the WebGL context.  Called from init() */
function initGL() {
    var prog = createProgram(gl,"vshader-source","fshader-source");
    gl.useProgram(prog);
    a_coords_loc =  gl.getAttribLocation(prog, "a_coords");
    a_normal_loc =  gl.getAttribLocation(prog, "a_normal");
    u_modelview = gl.getUniformLocation(prog, "modelview");
    u_projection = gl.getUniformLocation(prog, "projection");
    u_normalMatrix =  gl.getUniformLocation(prog, "normalMatrix");
    u_lightPosition=  gl.getUniformLocation(prog, "lightPosition");
    u_diffuseColor =  gl.getUniformLocation(prog, "diffuseColor");
    u_specularColor =  gl.getUniformLocation(prog, "specularColor");
    u_specularExponent = gl.getUniformLocation(prog, "specularExponent");
    a_coords_buffer = gl.createBuffer();
    a_normal_buffer = gl.createBuffer();
    index_buffer = gl.createBuffer();
    gl.enable(gl.DEPTH_TEST);
    gl.uniform3f(u_specularColor, 0.5, 0.5, 0.5);
    gl.uniform4f(u_diffuseColor, 1, 1, 1, 1);
    gl.uniform1f(u_specularExponent, 10);
    gl.uniform4f(u_lightPosition, 0, 0, 0, 1);
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type String is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 *    The second and third parameters are the id attributes for <script>
 * elementst that contain the source code for the vertex and fragment
 * shaders.
 */
function createProgram(gl, vertexShaderID, fragmentShaderID) {
    function getTextContent( elementID ) {
            // This nested function retrieves the text content of an
            // element on the web page.  It is used here to get the shader
            // source code from the script elements that contain it.
        var element = document.getElementById(elementID);
        var node = element.firstChild;
        var str = "";
        while (node) {
            if (node.nodeType == 3) // this is a text node
                str += node.textContent;
            node = node.nextSibling;
        }
        return str;
    }
    try {
        var vertexShaderSource = getTextContent( vertexShaderID );
        var fragmentShaderSource = getTextContent( fragmentShaderID );
    }
    catch (e) {
        throw "Error: Could not get shader source code from script elements.";
    }
    var vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vertexShaderSource);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw "Error in vertex shader:  " + gl.getShaderInfoLog(vsh);
     }
    var fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fragmentShaderSource);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw "Error in fragment shader:  " + gl.getShaderInfoLog(fsh);
    }
    var prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw "Link error in program:  " + gl.getProgramInfoLog(prog);
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    try {
        var canvas = document.getElementById("myGLCanvas");
        gl = canvas.getContext("webgl") || 
                         canvas.getContext("experimental-webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }

    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context:" + e + "</p>";
        return;
    }

    document.getElementById("my_gl").checked = false;
    document.getElementById("my_gl").onchange = draw;
    rotator = new TrackballRotator(canvas, draw, 15);
    draw();
}








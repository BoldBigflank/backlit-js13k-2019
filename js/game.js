var canvas = document.getElementById('renderCanvas')
var engine = new BABYLON.Engine(canvas, true)

const COLOR_RED = new BABYLON.Color3(1,0,0)
const COLOR_GREEN = new BABYLON.Color3(0,1,0)
const COLOR_BLUE = new BABYLON.Color3(0,0,1)
const COLOR_CYAN = new BABYLON.Color3(0,1,1)
const COLOR_MAGENTA = new BABYLON.Color3(1,0,1)
const COLOR_YELLOW = new BABYLON.Color3(1,1,0)

const SQRT_2 = Math.sqrt(2)
const SHAPE_SCALE = 0.1
const SHAPE_SCALE_V3 = new BABYLON.Vector3(SHAPE_SCALE, SHAPE_SCALE, SHAPE_SCALE)
var shapes = []
var selectedMesh
var grabbedMesh
var grabbingController
var lastDeviceQuaternion
var lastDevicePosition

var createScene = () => {
    // Scene and camera
    var scene = new BABYLON.Scene(engine)
    var camera = new BABYLON.ArcRotateCamera(
        'Camera', // Name
        11 * Math.PI / 12, // alpha
        5 * Math.PI / 12, // beta
        2, // radius
        new BABYLON.Vector3(0, 1.5 ,0), // target
        scene //scene
    )
    camera.position.y = 2
    camera.attachControl(canvas, true)
    
    // Lights
    var light1 = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1, 1, 0), scene)
    var light = new BABYLON.DirectionalLight('light2', new BABYLON.Vector3(1,0,0), scene)
    light.position.x = -500

    var myGround = BABYLON.MeshBuilder.CreateGround("myGround", {width: 6, height: 6, subdivisions: 4}, scene);
    
    // Wall 

    var wall1 = BABYLON.MeshBuilder.CreateBox('wall1', {
        size:3,
        faceColors: [
            COLOR_MAGENTA,
            COLOR_MAGENTA,
            COLOR_MAGENTA,
            COLOR_MAGENTA,
            COLOR_MAGENTA,
            COLOR_MAGENTA
        ]
    }, scene)
    wall1.position = new BABYLON.Vector3(3,1.5,0)
    wall1.receiveShadows = true


    //Create dynamic texture
    var textureResolution = 512;
    var textureGround = new BABYLON.DynamicTexture("dynamic texture", {width:512, height:512}, scene);   
    var ctx = textureGround.getContext();
    
    var materialGround = new BABYLON.StandardMaterial("Mat", scene);                    
    materialGround.diffuseTexture = textureGround;
    materialGround.backFaceCulling = false
    
    //Add text to dynamic texture
    // var font = "bold 44px monospace";
    // textureGround.drawText("Grass", 75, 135, font, "green", "white", true, true);
    var grd = ctx.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, "red");
    grd.addColorStop(0.55, "black");
    grd.addColorStop(1, "black");
    ctx.fillStyle = grd;
    ctx.fillRect(0,0, 512, 512);
    textureGround.update()

    // // // Sky
    var stars = BABYLON.Mesh.CreateSphere('stars', 100, 100, scene)
    stars.material = materialGround

    // Shapes
    var prism = BABYLON.MeshBuilder.ExtrudeShape('Grabbable-Prism1', {
        shape: [   
            new BABYLON.Vector3(-2, -0.6, 0),
            new BABYLON.Vector3(2,  -0.6, 0),
            new BABYLON.Vector3(0,   1.4, 0),
            new BABYLON.Vector3(-2, -0.6, 0)
        ],
        path: [
            new BABYLON.Vector3(0,  0, -0.5),
            new BABYLON.Vector3(0,  0, 0.5)
        ],
        cap: BABYLON.Mesh.CAP_ALL
    }, scene)
    prism.scaling = SHAPE_SCALE_V3
    prism.position = new BABYLON.Vector3(-0.5, 1.5, 0)
    shapes.push(prism)

    var prism3 = prism.clone("Grabbable-Prism3")
    prism3.position = new BABYLON.Vector3(-0.5, 1.0, -0.5)
    prism3.scaling = new BABYLON.Vector3(0.5 * SHAPE_SCALE, 0.5 * SHAPE_SCALE, 2 * SHAPE_SCALE)
    shapes.push(prism3)

    var prism4 = prism3.clone("Grabbable-Prism4")
    prism4.position = new BABYLON.Vector3(-0.5, 2, 0)
    prism4.scaling = new BABYLON.Vector3(0.5 * SHAPE_SCALE, 0.5 * SHAPE_SCALE, 0.5 * SHAPE_SCALE)
    shapes.push(prism4)

    var prism2 = BABYLON.MeshBuilder.CreateLathe('Grabbable-Prism2', {
        shape: [   
            new BABYLON.Vector3(0, -0.6, 0),
            new BABYLON.Vector3(2,  -0.6, 0),
            new BABYLON.Vector3(0,   1.4, 0),
            new BABYLON.Vector3(0, -0.6, 0)
        ],
        tessellation: 32,
        arc: 0.5
    }, scene)
    prism2.scaling = SHAPE_SCALE_V3
    prism2.position = new BABYLON.Vector3(-0.5, 1.5, 0.5)
    shapes.push(prism2)

    var cylinder = BABYLON.MeshBuilder.CreateCylinder(
        "Grabbable-Cylinder",
        {
            height: SQRT_2,
            diameter: SQRT_2,
            updatable: true,
            faceColors: [
                new BABYLON.Color4(1,0,0,1),
                new BABYLON.Color4(0,0,1,1),
                new BABYLON.Color4(0,1,1,1)
            ]
        },
        scene
    )
    var positions = cylinder.getVerticesData(BABYLON.VertexBuffer.PositionKind)
    var normals = cylinder.getVerticesData(BABYLON.VertexBuffer.NormalKind)
    var indices = cylinder.getIndices()
    // Skew the cylinder
    for (let i = 0; i < positions.length; i=i+3) {
        let y = positions[i+1]
        positions[i] += (y > 0) ? SQRT_2 / 2 : SQRT_2 / -2
    }
    BABYLON.VertexData.ComputeNormals(positions, indices, normals)
    cylinder.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions)
    cylinder.scaling = SHAPE_SCALE_V3
    cylinder.position = new BABYLON.Vector3(-0.5, 1.5, -0.5)
    shapes.push(cylinder)

    var donut = BABYLON.MeshBuilder.CreateLathe('Grabbable-Donut', {
        shape: [   
            new BABYLON.Vector3(SQRT_2/4,SQRT_2/2, 0),
            new BABYLON.Vector3(SQRT_2/4,  -SQRT_2/2, 0),
            new BABYLON.Vector3(SQRT_2/2,   -SQRT_2/2, 0),
            new BABYLON.Vector3(SQRT_2/2, SQRT_2/2, 0),
            new BABYLON.Vector3(SQRT_2/4,SQRT_2/2, 0)
        ],
        tessellation: 32,
        
        closed: true
    }, scene)
    donut.scaling = SHAPE_SCALE_V3
    donut.position = new BABYLON.Vector3(-0.5, 1.0, 0.5)
    shapes.push(donut)

    var pyramid = BABYLON.MeshBuilder.CreateLathe('Grabbable-Pyramid', {
        shape: [   
            new BABYLON.Vector3(0,-0.3 * SQRT_2, 0),
            new BABYLON.Vector3(SQRT_2,-0.3 * SQRT_2, 0),
            new BABYLON.Vector3(0, 0.7 * SQRT_2, 0)
        ],
        tessellation: 4,
        closed: true
    }, scene)
    pyramid.scaling = SHAPE_SCALE_V3
    pyramid.position = new BABYLON.Vector3(-0.5, 1.0, 0)
    shapes.push(pyramid)

    // Shadows
    var shadowGenerator = new BABYLON.ShadowGenerator(2048, light);
    // shadowGenerator.usePoissonSampling = true
    shadowGenerator.getShadowMap().renderList = shapes
    
    scene.onBeforeRenderObservable.add(() => {
        // Update the grabbed object
        if (grabbedMesh && grabbingController) {
            // Rotation
            var currentDeviceQuaternion = grabbingController.deviceRotationQuaternion.clone()
            if (lastDeviceQuaternion) {
                // Get the difference between the two quaternions
                var differenceQuat = currentDeviceQuaternion.multiply( BABYLON.Quaternion.Inverse(lastDeviceQuaternion) )
                // Add the difference to the grabbedMesh
                grabbedMesh.rotationQuaternion = differenceQuat.multiply( grabbedMesh.rotationQuaternion.clone() )
                grabbedMesh.rotationQuaternion = differenceQuat.multiply( grabbedMesh.rotationQuaternion.clone() )
            }
            lastDeviceQuaternion = currentDeviceQuaternion
            // Position on the XZ plane
            var currentDevicePosition = grabbingController.devicePosition.clone()
            if (lastDevicePosition) {
                var differencePos = currentDevicePosition.subtract(lastDevicePosition)
                differencePos.x = 0 // Don't move in the X direction
                grabbedMesh.position.addInPlace(differencePos)
            }
            lastDevicePosition = currentDevicePosition

        }
    })

    return scene
}

var scene = createScene()


// VR Stuff
var vrHelper = scene.createDefaultVRExperience({
    createDeviceOrientationCamera: false
});

vrHelper.enableTeleportation({floorMeshName: "myGround"});

vrHelper.enableInteractions()
// What meshes to interact with
vrHelper.raySelectionPredicate = (mesh) => {
    if (mesh.name.indexOf("Grabbable") !== -1) {
        return true;
    }
    return false;
};

vrHelper.onAfterEnteringVRObservable.add(() => {
    // Move the camera to the blocks and look at it
})

// Keep track of the selected mesh
vrHelper.onNewMeshSelected.add((mesh) => {
    selectedMesh = mesh;
});

vrHelper.onSelectedMeshUnselected.add(() => {
    selectedMesh = null;
});

// Behavior of the controllers
vrHelper.onControllerMeshLoaded.add((webVRController)=>{
    var controllerMesh = webVRController.mesh;
    
    webVRController.onTriggerStateChangedObservable.add(()=>{
        // Trigger pressed event
    });

    webVRController.onTriggerStateChangedObservable.add(function(stateObject) {
        // if(webVRController.hand=="left")
        //grab
        if(stateObject.value > 0.1){
            if (selectedMesh !== null) {
                // webVRController.mesh.addChild(selectedMesh);
                grabbedMesh = selectedMesh
                if (!grabbedMesh.rotationQuaternion) {
                    grabbedMesh.rotationQuaternion = new BABYLON.Vector4(0,0,0,1)
                }
                grabbingController = webVRController
            }
        //ungrab   
        } else {
            if (grabbedMesh) {
                // webVRController.mesh.removeChild(grabbedMesh);
                lastDeviceQuaternion = undefined
                lastDevicePosition = undefined
            }
            grabbedMesh = null
        }
    });
});

engine.runRenderLoop(() => {
    scene.render()
})

window.addEventListener('resize', () => {
    engine.resize()
})

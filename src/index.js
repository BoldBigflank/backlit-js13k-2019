var canvas = document.getElementById('renderCanvas')
var engine = new BABYLON.Engine(canvas, true)

const COLOR_RED = new BABYLON.Color3(1,0,0)
const COLOR_GREEN = new BABYLON.Color3(0,1,0)
const COLOR_BLUE = new BABYLON.Color3(0,0,1)
const COLOR_CYAN = new BABYLON.Color3(0,1,1)
const COLOR_MAGENTA = new BABYLON.Color3(1,0,1)
const COLOR_YELLOW = new BABYLON.Color3(1,1,0)
const COLOR_GREY = new BABYLON.Color3(.6, .5, .49)

const SQRT_2 = Math.sqrt(2)
const GRID_TO_UNITS = 1/3
const SHAPE_SCALE = 0.1
const SHAPE_SCALE_V3 = new BABYLON.Vector3(SHAPE_SCALE, SHAPE_SCALE, SHAPE_SCALE)
var shapes = []
var selectedMesh
var grabbedMesh
var grabbingController
var lastDeviceQuaternion
var lastDevicePosition

// Helper Functions
var scaledVector3 = (x, y, z, scale) => {
    scale = scale || GRID_TO_UNITS
    return new BABYLON.Vector3(x * scale, y * scale, z * scale)
}

var createPuzzleShape = (puzzle, axis, scene) => {
    axis = axis || 'y'
    let meshes = []
    // Assume a max grid size of 32x32
    let path = [scaledVector3(0,0,0,32)]
    pathX = (axis == 'x') ? 1 : 0
    pathY = (axis == 'y') ? 1 : 0
    pathZ = (axis == 'z') ? 1 : 0
    path.push(scaledVector3(pathX, pathY, pathZ, 1))

    puzzle.forEach((puzzleShape) => {
        let shape = []
        let mirrorShape = []
        puzzleShape.push(puzzleShape[0]) // Add the first to the end
        puzzleShape.forEach((point) => {
            let coords = point.split(',')
            let x = coords[0]
            let y = coords[1]
            let z = 0
            shape.push(scaledVector3(x, y, z, 1/32))
            mirrorShape.unshift(scaledVector3(32-x, y, z, 1/32))
        })
        var extrusion = BABYLON.MeshBuilder.ExtrudeShape("star", {
            shape: shape, 
            path: path, 
            cap: BABYLON.Mesh.CAP_ALL, 
            updatable: true
        }, scene);
        meshes.push(extrusion)

        var extrusion = BABYLON.MeshBuilder.ExtrudeShape("star", {
            shape: mirrorShape, 
            path: path, 
            cap: BABYLON.Mesh.CAP_ALL, 
            updatable: true
        }, scene);
        meshes.push(extrusion)
        // Mirror it

    })
    // Merge the meshes
    var newMesh = BABYLON.Mesh.MergeMeshes(meshes, true);
    // newMesh.scaling = 32
    return newMesh
}

var createScene = () => {
    // Scene and camera
    var scene = new BABYLON.Scene(engine)
    var camera = new BABYLON.UniversalCamera('Camera',
        scaledVector3(1, 6, 0),
        scene
    )
    camera.setTarget(scaledVector3(10, 4.5, 0))
    camera.speed = 0.33
    camera.attachControl(canvas, true)

    // Textures and Materials
    var textureFloor = new BABYLON.DynamicTexture("FloorTexture", {width:512, height:512}, scene);   
    var ctx = textureFloor.getContext();
    ctx.fillStyle = '#c5765f' // #f1bdaa
    ctx.fillRect(0,0,512,512)
    textureFloor.update()
    var materialFloor = new BABYLON.StandardMaterial("FloorMaterial", scene)
    materialFloor.diffuseTexture = textureFloor

    var textureGround = new BABYLON.DynamicTexture("GroundTexture", {width:512, height:512}, scene);   
    var ctx = textureGround.getContext();
    ctx.fillStyle = '#f1bdaa'
    ctx.fillRect(0,0,512,512)
    ctx.fillStyle = 'black'
    ctx.fillRect(192, 192, 128, 128)
    textureGround.update()
    var materialGround = new BABYLON.StandardMaterial("GroundMaterial", scene)
    materialGround.diffuseTexture = textureGround

    var textureSky = new BABYLON.DynamicTexture("SkyTexture", {width:512, height:512}, scene);
    var ctx = textureSky.getContext();
    var materialSky = new BABYLON.StandardMaterial("SkyMaterial", scene);
    materialSky.diffuseTexture = textureSky;
    materialSky.backFaceCulling = false
    var grd = ctx.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, "#d1b7ce"); // light #d1b7ce dark #1e2237
    grd.addColorStop(0.65, "#1e2237");
    grd.addColorStop(1, "black");
    ctx.fillStyle = grd;
    ctx.fillRect(0,0, 512, 512);
    textureSky.update()
    
    var textureShape = new BABYLON.DynamicTexture("ShapeTexture", {width:512, height:512}, scene);
    var ctx = textureShape.getContext();
    var materialShape = new BABYLON.StandardMaterial("ShapeMaterial", scene);
    materialShape.diffuseTexture = textureShape;
    ctx.fillStyle = '#3c7681';
    ctx.fillRect(0,0, 512, 512);
    textureShape.update()
    


    // Lights
    var light1 = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(-1, 1, 0.01), scene)
    light1.intensity = 0.5 // 0.5
    var light = new BABYLON.DirectionalLight('light2', new BABYLON.Vector3(1,0,0), scene)
    light.position.x = -500
    light.intensity = 0.2

    var floor = BABYLON.MeshBuilder.CreateGround('Floor', {
        width:600,
        height:600,
        subdivisions: 6
    }, scene)
    floor.position.y = -0.01
    floor.material = materialFloor

    var pathGround = BABYLON.MeshBuilder.CreateGround("Ground-Path", {
        width: 600*GRID_TO_UNITS,
        height: 8*GRID_TO_UNITS,
        subdivisions: 4
    }, scene);
    pathGround.position.x = -300*GRID_TO_UNITS
    pathGround.material = materialGround

    // Wall
    var wall1 = BABYLON.MeshBuilder.CreateBox('wall1', {
        height: 9 * GRID_TO_UNITS,
        width: 1 * GRID_TO_UNITS,
        depth: 6 * GRID_TO_UNITS,
        faceColors: [
            COLOR_GREY,
            COLOR_GREY,
            COLOR_GREY,
            COLOR_GREY,
            COLOR_GREY,
            COLOR_GREY
        ]
    }, scene)
    wall1.position = scaledVector3(10, 4.5, 0)
    wall1.receiveShadows = true

    // Sky
    var stars = BABYLON.Mesh.CreateSphere('stars', 100, 1000, scene)
    stars.material = materialSky

    // Moon
    var moon = BABYLON.Mesh.CreateSphere('moon', 100, 75, scene)
    moon.position.x = -500
    moon.position.y = 50

    // Shapes
    //Array of paths to construct extrusion
    var scarabShape = [
        [ // arm
            '9,19',
            '10,17',
            '11,19',
            '12,22',
            '11,23'
        ],
        [ // head
            '16,21',
            '14,21',
            '12,20',
            '13,19',
            '16,19'
        ],
        [ // leg
            '10,0',
            '11,1',
            '10,4',
            '10,6',
            '8,4'
        ],
        [ // butt
            '10,8',
            '12,4',
            '15,2',
            '15,13',
            '12,13',
            '11,14'
        ],
        [ // mid
            '16,18',
            '12,18',
            '11,16',
            '12,14',
            '16,14'
        ],
        [ // wing
            '7,21',
            '9,27',
            '13,31',
            '12,32',
            '6,30',
            '2,26',
            '0,21',
        ],[
            '7,21',
            '0,21',
            '0,16',
            '3,9',
            '6,6',
            '9,6',
            '10,14'
        ],
        [ // moon
            '16,31',
            '13,30',
            '12,27',
            '13,24',
            '16,23'
        ]
    ]
    createPuzzleShape(scarabShape, 'y', scene)

        // var myShape = [
        //         new BABYLON.Vector3(0, 5, 0),
        //         new BABYLON.Vector3(1, 1, 0),
        //         new BABYLON.Vector3(5, 0, 0),
        //         new BABYLON.Vector3(1, -1, 0),
        //         new BABYLON.Vector3(0, -5, 0),
        //         new BABYLON.Vector3(-1, -1, 0),
        //         new BABYLON.Vector3(-5, 0, 0),
        //         new BABYLON.Vector3(-1, 1, 0)
        // ];
        
        // myShape.push(myShape[0]);
        
        // var myPath = [
        //         new BABYLON.Vector3(0, 0, 0),
        //         new BABYLON.Vector3(0, 0, 2),
        //         new BABYLON.Vector3(0, 0, 4),
        //         new BABYLON.Vector3(0, 0, 6),
        //         new BABYLON.Vector3(0, 0, 8),
        //         new BABYLON.Vector3(0, 0, 10)
        // ];
        
        // //Create extrusion with updatable parameter set to true for later changes
        // var extrusion = BABYLON.MeshBuilder.ExtrudeShape("star", {shape: myShape, path: myPath, sideOrientation: BABYLON.Mesh.DOUBLESIDE, updatable: true}, scene);
                

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
    prism.position = new BABYLON.Vector3(5 * GRID_TO_UNITS, 1.5, 0)
    prism.material = materialShape
    shapes.push(prism)

    var prism3 = prism.clone("Grabbable-Prism3")
    prism3.position = new BABYLON.Vector3(5 * GRID_TO_UNITS, 1.0, -0.5)
    prism3.scaling = new BABYLON.Vector3(0.5 * SHAPE_SCALE, 0.5 * SHAPE_SCALE, 2 * SHAPE_SCALE)
    shapes.push(prism3)

    var prism4 = prism3.clone("Grabbable-Prism4")
    prism4.position = new BABYLON.Vector3(5 * GRID_TO_UNITS, 2, 0)
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
    prism2.position = new BABYLON.Vector3(5 * GRID_TO_UNITS, 1.5, 0.5)
    prism2.material = materialShape
    shapes.push(prism2)

    var cylinder = BABYLON.MeshBuilder.CreateCylinder(
        "Grabbable-Cylinder",
        {
            height: SQRT_2,
            diameter: SQRT_2,
            updatable: true
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
    cylinder.position = new BABYLON.Vector3(5 * GRID_TO_UNITS, 1.5, -0.5)
    cylinder.material = materialShape
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
    donut.position = new BABYLON.Vector3(5 * GRID_TO_UNITS, 1.0, 0.5)
    donut.material = materialShape
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
    pyramid.position = new BABYLON.Vector3(5 * GRID_TO_UNITS, 1.0, 0)
    pyramid.material = materialShape
    shapes.push(pyramid)

    // var person = BABYLON.MeshBuilder.CreateBox('Person', {
    //     size: 0.5,
    //     height: 1.5
    // }, scene)
    // person.position.y = 0.75

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

    // The pyramid
    // var building = BABYLON.MeshBuilder.CreateBox('Building-Outside', {
    //     size: 42 * GRID_TO_UNITS
    // }, scene)
    var building = BABYLON.MeshBuilder.CreateCylinder('Building-Outisde', {
        height: 480 * GRID_TO_UNITS,
        diameterTop: 0,
        diameterBottom: 755 * GRID_TO_UNITS,
        tessellation: 4
    }, scene)
    building.position.x = 271 * GRID_TO_UNITS
    building.position.y = 240 * GRID_TO_UNITS
    building.rotation.y = Math.PI * 0.25

    var buildingCSG = BABYLON.CSG.FromMesh(building)

    var roomStamp = BABYLON.MeshBuilder.CreateBox('Building-Inside', {
        size: 1
    }, scene)

    var rooms = [
        { // Start room
            name: 'Start',
            position: scaledVector3(5, 0, 0),
            scaling: scaledVector3(10, 16, 10)
        },
        { // Corridor
            name: 'Corridor',
            position: scaledVector3(20, 0, 0),
            scaling: scaledVector3(20, 12, 6)
        },
        { // Middle room
            name: 'Middle',
            position: scaledVector3(40,0,0),
            scaling: scaledVector3(20, 20, 20)
        },
        { // Big room
            name: 'Treasure',
            position: scaledVector3(100,0,0),
            scaling: scaledVector3(100, 100, 128)
        }
    ]

    var groundStamp = BABYLON.MeshBuilder.CreateGround("Ground-Stamp", {
        size: 1,
        subdivisions: 4
    }, scene)
    groundStamp.material = materialGround

    rooms.forEach(room => {
        // Cut out the room
        roomStamp.scaling = room.scaling
        roomStamp.position = room.position
        buildingCSG.subtractInPlace(BABYLON.CSG.FromMesh(roomStamp))
        // Give it a floor
        let ground = groundStamp.clone('Ground-' + room.name)
        ground.scaling = room.scaling
        ground.position = room.position
    })

    var mat = new BABYLON.StandardMaterial('std', scene);
        mat.alpha = 0.7;

    buildingCSG.toMesh('Building', mat, scene, false);
    building.dispose()
    roomStamp.dispose()
    return scene
}

var scene = createScene()


// VR Stuff
var vrHelper = scene.createDefaultVRExperience({
    createDeviceOrientationCamera: false
});

// [outsideGround, insideGround, treasureGround]
let floorMeshes = scene.meshes.filter(m => m.name.indexOf('Ground') !== -1)
vrHelper.enableTeleportation({floorMeshes: floorMeshes});

vrHelper.enableInteractions()
// What meshes to interact with
vrHelper.raySelectionPredicate = (mesh) => {
    if (mesh.name.indexOf("Grabbable") !== -1) {
        return true;
    }
    if (mesh.name.indexOf("Ground") !== -1) {
        return true;
    }
    return false;
};

vrHelper.onAfterEnteringVRObservable.add(() => {
    // Move the camera to the blocks and look at it
})

// Keep track of the selected mesh
vrHelper.onNewMeshSelected.add((mesh) => {
    if (mesh.name.indexOf('Grabbable') === -1) return
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
                // Only grab grabbable
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

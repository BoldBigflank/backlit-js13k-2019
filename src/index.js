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
    const shapeShift = scaledVector3(1, 1, 0, 1/32)
    let meshes = []
    // Assume a max grid size of 32x32
    let path = []
    pathX = (axis == 'x') ? 1 : 0
    pathY = (axis == 'y') ? 1 : 0
    pathZ = (axis == 'z') ? 1 : 0
    path.push(scaledVector3(-pathX, -pathY, -pathZ, 1/2))
    path.push(scaledVector3(pathX, pathY, pathZ, 1/2))

    puzzle.forEach((puzzleShape) => {
        let shape = []
        let mirrorShape = []
        puzzleShape.push(puzzleShape[0]) // Add the first to the end
        puzzleShape.forEach((point) => {
            let coords = point.split(',')
            let x = coords[0]
            let y = coords[1]
            let z = 0
            shape.push(scaledVector3(x-16, y-16, z, 1/32))
            mirrorShape.unshift(scaledVector3(32-x-16, y-16, z, 1/32))
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
    scene.collisionsEnabled = true
    var camera = new BABYLON.UniversalCamera('Camera',
        scaledVector3(-10, 5, 0),
        scene
    )

    camera.keysUp = [87]
    camera.keysLeft = [65]
    camera.keysDown = [83]
    camera.keysRight = [68]
    camera.minZ = 0.1

    camera.applyGravity = true
    camera.checkCollisions = true
    camera.ellipsoid = new BABYLON.Vector3(0.5, 0.75, 0.5)

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
    
    // Solution shape
    var textureSolution = new BABYLON.DynamicTexture("SolutionTexture", {width:512, height:512}, scene);
    var ctx = textureSolution.getContext();
    var materialSolution = new BABYLON.StandardMaterial("SolutionMaterial", scene);
    materialSolution.diffuseTexture = textureSolution;
    ctx.fillStyle = '#be6f54';
    ctx.fillRect(0,0, 512, 512);
    textureSolution.update()
    

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
    floor.checkCollisions = true

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
    var scarab = createPuzzleShape(scarabShape, 'y', scene)
    scarab.name = "Grabbable-Scarab"

    var ankhShape = [
        [
            '16,32',
            '12,31',
            '10,27',
            '13,26',
            '16,28'
        ],[
            '10,27',
            '10,24',
            '13,25',
            '13,26'
        ],[
            '10,24',
            '14,19',
            '16,19',
            '16,20',
            '13,25'
        ],[
            '16,19',
            '14,19',
            '14,18',
            '16,18'
        ],[
            '16,18',
            '14,18',
            '8,19',
            '8,14',
            '14,15',
            '16,15'
        ],[
            '16,15',
            '14,15',
            '12,0',
            '16,0'
        ]
    ]
    var ankh = createPuzzleShape(ankhShape, 'x', scene)
    ankh.name = "Solution-Ankh"
    ankh.material = materialSolution

    var ankhCSG = BABYLON.CSG.FromMesh(ankh)
    var scarabCSG = BABYLON.CSG.FromMesh(scarab)

    ankhCSG.intersectInPlace(scarabCSG)
    var ankhScarabMesh = ankhCSG.toMesh('Grabbable-Ankh-Scarab', materialShape, scene, false)
    ankhScarabMesh.position.y = 1
    // Form it into 3 parts
    
    // shapes.push(ankh)
    // var topStamp = BABYLON.MeshBuilder.CreateSphere('Ankh-Top-Stamp', {
    //     diameter: 1
    // }, scene)
    // var topStamp = BABYLON.MeshBuilder.CreateBox('Ankh-Top-Stamp', {
    //     size: 1
    // }, scene)
    
    // topStamp.scaling = scaledVector3(18, 14, 14, 1/32)
    // topStamp.position.y = 9 / 32
    // var ankhTopCSG = ankhCSG.intersect(BABYLON.CSG.FromMesh(topStamp))
    // var ankhTop = ankhTopCSG.toMesh('Grabbable-Ankh-Top', materialShape, scene, true)
    // ankhTop.position.y = 2
    // // TODO: Set the ankhTop pivot point to 9/32
    // shapes.push(ankhTop)

    // topStamp.position.y = 0
    // topStamp.scaling = scaledVector3(28, 8, 28, 1/32)
    // var ankhMiddleCSG = ankhCSG.intersect(BABYLON.CSG.FromMesh(topStamp))
    // var ankhMiddle = ankhMiddleCSG.toMesh('Grabbable-Ankh-Middle', materialShape, scene, true)
    // ankhMiddle.position.y = 1.5
    // shapes.push(ankhMiddle)

    // topStamp.position.y = -8.5 / 32
    // topStamp.scaling = scaledVector3(1, 15, 10, 1/32)
    // var ankhBottomCSG = ankhCSG.intersect(BABYLON.CSG.FromMesh(topStamp))
    // var ankhBottom = ankhBottomCSG.toMesh('Grabbable-Ankh-Bottom', materialShape, scene, true)
    // ankhBottom.position.y = 1.0
    // shapes.push(ankhBottom)

    // topStamp.dispose()

    // Place the ankh solution
    ankh.position = scaledVector3(9,4,0)
    ankh.scaling.x = 0.01
    ankh.receiveShadows = true

    // Shadows
    var shadowGenerator = new BABYLON.ShadowGenerator(2048, light);
    // shadowGenerator.usePoissonSampling = true
    shadowGenerator.getShadowMap().renderList = shapes
    

    // Used for grabbing and rotating shapes
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
            }
            lastDeviceQuaternion = currentDeviceQuaternion
            // Position on the XZ plane
            var currentDevicePosition = grabbingController.devicePosition.clone()
            if (lastDevicePosition) {
                var differencePos = currentDevicePosition.subtract(lastDevicePosition)
                differencePos.x = 0 // Don't move in the X direction
                grabbedMesh.position.addInPlace(differencePos)
                grabbedMesh.position.addInPlace(differencePos)
                grabbedMesh.position.addInPlace(differencePos)
            }
            lastDevicePosition = currentDevicePosition

        }
    })

    // The pyramid
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
            scaling: scaledVector3(20, 16, 6)
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

    var FullBuilding = buildingCSG.toMesh('Building', mat, scene, false);
    building.dispose()
    roomStamp.dispose()
    FullBuilding.checkCollisions = true
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

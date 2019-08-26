var canvas = document.getElementById('renderCanvas')
var engine = new BABYLON.Engine(canvas, true)

const COLOR_MAGENTA = new BABYLON.Color4(1,0,1,1)

var selectedMesh
var grabbedMesh
var grabbingController
var lastDeviceQuaternion
var lastDevicePosition
var webVRControllers = []

var createScene = function () {
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
    // Shapes
    var box = BABYLON.MeshBuilder.CreateBox('Grabbable-Box', {
        size: .16,
        faceColors: [
            new BABYLON.Color4(1,0,0,1),
            new BABYLON.Color4(1,0,1,1),
            new BABYLON.Color4(0,0,1,1),
            new BABYLON.Color4(0,1,1,1),
            new BABYLON.Color4(0,1,0,1),
            new BABYLON.Color4(1,1,0,1)
        ]
    }, scene)
    box.position = new BABYLON.Vector3(0, 1.5, 0)

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

    // Shadows
    var shadowGenerator = new BABYLON.ShadowGenerator(2048, light);
    // shadowGenerator.usePoissonSampling = true
    shadowGenerator.getShadowMap().renderList.push(box)
    wall1.receiveShadows = true

    scene.registerBeforeRender(function() {
        // Take the 
    })

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

// Keep track of the selected mesh
vrHelper.onNewMeshSelected.add(function(mesh) {
    console.log("new selectedMesh")
    selectedMesh = mesh;
});

vrHelper.onSelectedMeshUnselected.add(function() {
    console.log("remove selectedMesh")
    selectedMesh = null;
});

// Behavior of the controllers
vrHelper.onControllerMeshLoaded.add((webVRController)=>{
    var controllerMesh = webVRController.mesh;
    webVRControllers.push(webVRController)

    webVRController.onTriggerStateChangedObservable.add(()=>{
        // Trigger pressed event
    });

    webVRController.onTriggerStateChangedObservable.add((stateObject)=>{
        // if(webVRController.hand=="left")
        //grab
        if(stateObject.value > 0.1){
            if (selectedMesh !== null) {
                // webVRController.mesh.addChild(selectedMesh);
                grabbedMesh = selectedMesh
                if (!grabbedMesh.rotationQuaternion) {
                    console.log("resetting quaternion", grabbedMesh.rotation)
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


engine.runRenderLoop(function() {
    // Is this where we set the 
    scene.render()
})

window.addEventListener('resize', function() {
    engine.resize()
})

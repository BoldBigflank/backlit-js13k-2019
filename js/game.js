var canvas = document.getElementById('renderCanvas')
var engine = new BABYLON.Engine(canvas, true)

const COLOR_MAGENTA = new BABYLON.Color4(1,0,1,1)

var selectedMesh
var grabbedMesh
var grabbingController
var lastDeviceQuaternion
var lastDevicePosition

var controllerStatus = [
    // {
    //     controllerId: 1,
    //     selectedMesh: undefined,
    //     grabbedMesh: undefined,
    //     lastDeviceQuaternion: undefined,
    //     lastDevicePosition: undefined
    // }
]

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

    var box2 = box.clone('Grabbable-Box2')
    box2.position.y = 2

    var cylinder = BABYLON.MeshBuilder.CreateCylinder(
        "Grabbable-Cylinder",
        {
            height: 0.2,
            diameter: 0.15,
            updatable: true,
            faceColors: [
                new BABYLON.Color4(1,0,0,1),
                new BABYLON.Color4(0,0,1,1),
                new BABYLON.Color4(0,1,1,1)
            ]
        },
        scene
    )
    cylinder.position = new BABYLON.Vector3(0, 1.5, -0.5)

    var tube = BABYLON.MeshBuilder.CreateTube(
        "Grabbable-Tube",
        {
            path: [
                new BABYLON.Vector3(-0.2,0,-0.1),
                new BABYLON.Vector3(-0.1,0,0),
                // new BABYLON.Vector3(0,0,0),
                new BABYLON.Vector3(0.1,0,0),
                new BABYLON.Vector3(0.2,0.1,0)
            ],
            radius: 0.08,
            cap: BABYLON.Mesh.CAP_ALL
        },
        scene
    )
    tube.position = new BABYLON.Vector3(0,1.5,0.5)

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
    shadowGenerator.getShadowMap().renderList.push(box, box2, cylinder, tube)
    wall1.receiveShadows = true

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

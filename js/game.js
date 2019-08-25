var canvas = document.getElementById('renderCanvas')
var engine = new BABYLON.Engine(canvas, true)

var createScene = function () {
    // Scene and camera
    var scene = new BABYLON.Scene(engine)
    var camera = new BABYLON.ArcRotateCamera('Camera', Math.PI / 2, Math.PI / 2, 2, new BABYLON.Vector3(0,1,0.33), scene)
    camera.attachControl(canvas, true)
    
    // Lights
    // var light1 = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1, 1, 0), scene)
    var light = new BABYLON.PointLight('light2', new BABYLON.Vector3(-5,0,1), scene)
    

    var myGround = BABYLON.MeshBuilder.CreateGround("myGround", {width: 6, height: 4, subdivisions: 4}, scene);
    // Shapes
    var box = BABYLON.MeshBuilder.CreateBox('Grabbable-Box', {size: .33}, scene)
    box.position = new BABYLON.Vector3(0, 1, 0)

    var wall1 = BABYLON.MeshBuilder.CreateBox('wall1', {size:3}, scene)
    wall1.position = new BABYLON.Vector3(3,1.5,0)

    // Shadows
    var shadowGenerator = new BABYLON.ShadowGenerator(2048, light);
    // shadowGenerator.usePoissonSampling = true
    shadowGenerator.getShadowMap().renderList.push(box)
    wall1.receiveShadows = true

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

var selectedMesh
var grabbedMesh
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
    webVRController.onTriggerStateChangedObservable.add(()=>{
        // Trigger pressed event
    });

    webVRController.onTriggerStateChangedObservable.add((stateObject)=>{
        // if(webVRController.hand=="left")
        //grab
        console.log("stateObject.value", stateObject.value)
        if(stateObject.value > 0.01){
            if (selectedMesh !== null) {
                webVRController.mesh.addChild(selectedMesh);
                grabbedMesh = selectedMesh
            }
        //ungrab   
        } else {
            if (grabbedMesh)
                webVRController.mesh.removeChild(grabbedMesh);
            grabbedMesh = null
        }
    });
});


engine.runRenderLoop(function() {
    scene.render()
})

window.addEventListener('resize', function() {
    engine.resize()
})

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
const RAYCAST_COOLDOWN = 20 // Frames between lamp raycasts
const SHAPE_SCALE_V3 = new BABYLON.Vector3(SHAPE_SCALE, SHAPE_SCALE, SHAPE_SCALE)
var shapes = []
var materials = []
var selectedMesh
var grabbedMesh
var clonedMesh
var grabbingController
var lastDeviceQuaternion
var startDeviceQuaternion
var startMeshQuaternion
var lastDevicePosition
var billboardMaterial

// Helper Functions
var scaledVector3 = (x, y, z, scale) => {
    scale = scale || GRID_TO_UNITS
    return new BABYLON.Vector3(x * scale, y * scale, z * scale)
}

var roundToDegrees = (rot, deg) => {
    var radians = deg * Math.PI / 180
    rot.x = Math.round(rot.x / radians) * radians
    rot.y = Math.round(rot.y / radians) * radians
    rot.z = Math.round(rot.z / radians) * radians
    return rot
}

var eyeShape = {
    shouldMirror: false,
    points: [
        [
            '0, 27',
            '0, 24',
            '20, 30',
            '19, 32',
        ],[
            '19, 32',
            '20, 30',
            '25, 30',
            '25, 32'
        ],[
            '25, 32',
            '25, 30', 
            '32, 28',
            '32, 30'
        ],[
            '0, 20',
            '0, 19',
            '1, 18',
            '6, 18',
            '6, 20',
            '2, 21',
            '1, 21'
        ],[
            '2, 21',
            '6, 20',
            '14, 23',
            '14, 25'
        ],[
            '14, 25',
            '14, 23',
            '18, 23',
            '18, 25'
        ],[
            '18, 25',
            '18, 23',
            '27, 21',
            '32, 22'
        ],[
            '32, 22',
            '27, 21',
            '27, 20',
            '32, 19'
        ],[
            '32, 19',
            '27, 20',
            '17, 17',
            '18, 15'
        ],[
            '9, 17',
            '7, 15',
            '18, 15',
            '17, 17'
        ],[
            '9, 17',
            '6, 18',
            '2, 18',
            '7, 15'
        ],[ // eye
            '9, 21',
            '9, 20',
            '11, 18',
            '14, 18',
            '16, 20',
            '16, 22',
            '15, 23',
            '14, 23'
        ],[
            '7, 15',
            '3, 7',
            '4, 6',
            '6, 6',
            '9, 13'
        ],[ // tail
            '10, 15',
            '7, 15',
            '19, 3',
            '20, 5'
        ],[
            '20, 5',
            '19, 3',
            '24, 0',
            '25, 2'
        ],[
            '25, 2',
            '24, 0',
            '29, 0',
            '28, 2'
        ],[
            '28, 2',
            '29, 0',
            '32, 3',
            '30, 4'
        ],[
            '30, 4',
            '32, 3',
            '32, 6',
            '30, 5'
        ],[
            '30, 5',
            '32, 6',
            '30, 8',
            '29, 6'
        ],[
            '29, 6',
            '30, 8',
            '27, 8',
            '28, 6'
        ],[
            '28, 6',
            '27, 8',
            '26, 7',
            '26, 5',
            '27, 4',
            '28, 4'
        ]
    ],
    hitPoints: [
        '2,26',
        '12,29',
        '29,30',
        '3,19',
        '12,20',
        '30,20',
        '5,8',
        '12,12',
        '18,6',
        '23,2',
        '27,6',
    ],
    missPoints: [
        '3,29',
        '14,26',
        '8,19',
        '20,20',
        '29,24',
        '4,14',
        '10,10',
        '16,13',
        '24,5',
        '28,10'
    ]
}

var scarabShape = {
    shouldMirror: true,
    points: [
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
    ],
    hitPoints: [
        '14,27',
        '5,26',
        '13,17',
        '2,16',
        '13,15',
        '14,4',
        '9,4',
        '18,27',
        '27,26',
        '19,17',
        '30,14',
        '19,15',
        '18,4',
        '23,4'
    ],
    missPoints: [
        '2,30',
        '10,26',
        '14,22',
        '12,19',
        '1,10',
        '7,5',
        '12,3',
        '16,4',
        '16,12',
        '30,30',
        '22,26',
        '18,22',
        '20,19',
        '31,10',
        '25,5',
        '20,3'
    ]
}

var ankhShape = {
    shouldMirror: true,
    points: [
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
        ],[ // moon
            '6, 30',
            '4, 30',
            '2, 28',
            '2, 26',
            '4, 24',
            '6, 24',
            '8, 26',
            '8, 28'
        ],[ // pyramid
            '5, 10',
            '0, 5',
            '10, 5'
        ]
    ],
    hitPoints: [
        '5,27',
        '13,29',
        '13,22',
        '10,17',
        '10,15',
        '15,12',
        '14,3',
        '5,7',
        '27,27',
        '19,29',
        '19,22',
        '22,17',
        '22,15',
        '17,12',
        '18,3',
        '27,7'
    ],
    missPoints: [
        '2,30',
        '9,30',
        '9,26',
        '10,20',
        '6,16',
        '8,12',
        '10,8',
        '5,4',
        '30,30',
        '23,30',
        '23,26',
        '22,20',
        '26,16',
        '24,12',
        '22,8',
        '27,4'
    ]
}

var messages = [
    {
        puzzles: [0],
        name: 'Message-0',
        position: scaledVector3(-500, 3, 3),
        lines: [
            "",
            "Press up on the track",
            "pad to teleport."
        ]
    },
    {
        puzzles: [0],
        name: 'Message-Intro',
        position: scaledVector3(-510, 4, 0),
        lines: [
            "Once per year, the",
            "Moon lights up the path.",
            "Entry is normally impossible",
            "except for right now."
        ]
    },
    {
        puzzles: [0],
        name: 'Message-1',
        position: scaledVector3(-300, 5, 0),
        lines: [
            "You came at the right time.",
            "Get the Golden Scarab",
            "And bring it back.",
            "I believe in you"
        ]
    },{
        puzzles: [0],
        name: 'Message-Tutorial-1',
        position: scaledVector3(-3, 1, -5),
        lines: [
            "Use trigger to grab",
            "an object. Move the",
            "controller to pivot",
            "in place"
        ]
    },{
        puzzles: [1],
        name: 'Message-2',
        position: scaledVector3(5, 2, 0),
        lines: [
            "Your preparations have",
            "paid off. You see the ",
            "path forward"
        ]
    },{
        puzzles: [1],
        name: 'Message-Hint-1',
        position: scaledVector3(37, 3, -8),
        lines: [
            "These pillars seem a little",
            "out of place. Perhaps they ",
            "will be imporatnt later."
        ]
    },{
        puzzles: [1],
        name: 'Message-Plot-1',
        position: scaledVector3(48, 3, 8),
        lines: [
            "The backlit statue pieces",
            "are lined up perfectly to",
            "match the second puzzle.",
            "Now's our chance!"
        ]
    },{
        puzzles: [3],
        name: 'Message-Lamp-Explain',
        position: scaledVector3(100, 3, 0),
        lines: [
            "Grab one of these gems",
            "and rotate your controller",
            "to aim the beam of light",
            "at objects in the room"
        ]
    },{
        puzzles: [2],
        name: 'Message-Lamp-Hint',
        position: scaledVector3(100, 20, 0),
        lines: [
            "Have you found all of",
            "the prisms?",
            "There's only one way to",
            "bounce the light to all four"
        ]
    },{
        puzzles: [3,4],
        name: 'Message-Treasure-Explain',
        position: scaledVector3(100, 3, -3),
        lines: [
            "Grabbing the Golden Scarab",
            "will bring it to your hand"
        ]
    },{
        puzzles: [4],
        name: 'Message-Darkness-Explain',
        position: scaledVector3(100, 3, 0),
        lines: [
            "Oh no! Touching the treasure",
            "has shut the front door!",
            "How will we get out?"
        ]
    },{
        puzzles: [4],
        name: 'Message-Hint-2',
        position: scaledVector3(37, 3, -8),
        lines: [
            "These pillars are getting",
            "a lot of light. Can we block",
            "it somehow?"
        ]
    },{
        puzzles: [5],
        name: 'Message-End',
        position: scaledVector3(0,5,0),
        lines: [
            "You made it out!",
            "Congrats!",
            "Thanks for playing :)"
        ]
    },{
        puzzles: [5],
        name: 'Message-Credits-1',
        position: scaledVector3(-30,5,0),
        lines: [
            "",
            "Made by",
            "Alex Swan"
        ]
    },{
        puzzles: [5],
        name: 'Message-Credits-2',
        position: scaledVector3(-130,5,0),
        lines: [
            "For JS13KGames",
            "2019",
            "Theme - Back"
        ]
    },{
        puzzles: [5],
        name: 'Message-Credits-3',
        position: scaledVector3(-230,5,0),
        lines: [
            "My first experience with ",
            "BabylonJS",
            "I'd recommend it :)"
        ]
    },{
        puzzles: [5],
        name: 'Message-Credits-4',
        position: scaledVector3(-330,5,0),
        lines: [
            "I enjoyed making it.",
            "Let me know how long it",
            "took to complete!",
            "Thanks again!"
        ]
    },{
        puzzles: [5],
        name: 'Message-Credits-5',
        position: scaledVector3(-600,5,0),
        lines: [
            "That's all,",
            "It's time to submit",
            "Bye!"
        ]
    }

]

var puzzles = [
    {
        type: 'puzzle',
        shapes: [ankhShape, scarabShape],
        rotated: true,
        position: '0,4,0',
        solution: '9.5,0,0',
        rewardDoor: 'Door-1'
    },
    {
        type: 'puzzle',
        shapes: [scarabShape],
        position: '40,4,0',
        solution: '8.5,0,0',
        rewardDoor: 'Door-2'
    },
    {
        // The Ray puzzle
        type: "rays",
        rewardDoor: 'Door-Treasure'
    },
    {
        type: 'treasure',
        rewardDoor: 'Door-1', // Closes the door
        rewardDarkness: true
    },
    {
        type: 'useScarab',
        rewardLight: true,
        rewardDoor: 'Door-1'
    },
    {
        type: 'end'
    }
]

class GameManager {
    constructor() {
        this.state = 0
        this.currentPuzzleIndex = -1
        this.scene = null
        this.shapeMat = null
        this.shadowGenerator = null
        this.raycastCooldown = RAYCAST_COOLDOWN
        this.puzzleParent = null
        this.lamps = []
    }
    SetupNextPuzzle() {
        console.log("SetupNextPuzzle", this.currentPuzzleIndex)
        if (!this.scene || !this.shapeMat) {
            console.error('missing scene or shapeMat')
            return
        }


        // Clean up the existing puzzle
        if (this.currentPuzzleIndex > -1) {
            if (this.currentPuzzle.rewardDoor) {
                var door = this.scene.getMeshByName(this.currentPuzzle.rewardDoor)
                var doorY = door.position.y
                var doorEndY = -1 * door.position.y
                
                BABYLON.Animation.CreateAndStartAnimation('doorSlide', door, 'position.y', 30, 120, doorY, doorEndY, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            }

            if (this.currentPuzzle.rewardDarkness) {
                BABYLON.Animation.CreateAndStartAnimation('lightsOff', this.light, 'intensity', 30, 120, 0.5, 0.01, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                // TODO: Turn off the Glow elements too
            }
            if (this.currentPuzzle.rewardLight) {
                BABYLON.Animation.CreateAndStartAnimation('lightsOff', this.light, 'intensity', 30, 120, 0.01, 0.5, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            }

            if (this.currentPuzzle.type === 'rays') {
                this.lamps.forEach((lamp) => {
                    lamp.setEnabled(false)
                    lamp.position.y = -1 * Math.abs(lamp.position.y)
                    lamp.getChildren().forEach((child) => {
                        child.setEnabled(false)
                    })
                })
            }

            // Also send the current puzzle into the floor
            if (this.puzzleShapes) {
                this.puzzleShapes.forEach((shape) => {
                    shape.setParent(null)
                    let shapeY = shape.position.y
                    BABYLON.Animation.CreateAndStartAnimation(shape.name + '-Slide', shape, 'position.y', 30, 120, shapeY, -1 * shapeY, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
                })
            }
            if (this.solutionShape) {
                let solutionY = this.solutionShape.position.y
                BABYLON.Animation.CreateAndStartAnimation(this.solutionShape + '-Slide', this.solutionShape, 'position.y', 30, 120, solutionY, -1 * solutionY, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            }
        }

        this.currentPuzzleIndex++
        this.currentPuzzle = puzzles[this.currentPuzzleIndex]
        this.puzzleParent = this.puzzleParent || new BABYLON.Mesh('Puzzle-Parent', this.scene)
        this.puzzleParent.position = BABYLON.Vector3.Zero()
        this.puzzleParent.rotation = BABYLON.Vector3.Zero()
        this.puzzleShapes = undefined
        this.solutionShape = undefined


        // Final puzzle, two different lights
        if (this.currentPuzzle.type == 'useScarab') {
            var lightNW = new BABYLON.DirectionalLight('Light-NW', new BABYLON.Vector3(-1, 0, 1), this.scene)
            lightNW.position = scaledVector3(150, 4.5, -50)
            // lightNW.position.x = 500
            lightNW.intensity = 0.5

            var lightSW = lightNW.clone('Light-SW')
            lightSW.direction = new BABYLON.Vector3(-1, 0, -1)
            lightSW.position = scaledVector3(150, 4.5, 50)

            this.shadowGeneratorNW = new BABYLON.ShadowGenerator(2048, lightNW);
            this.shadowGeneratorSW = new BABYLON.ShadowGenerator(2048, lightSW);

            let treasureShape = this.scene.getMeshByName('Holdable-Treasure')
            this.shadowGeneratorNW.addShadowCaster(treasureShape, true)
            this.shadowGeneratorSW.addShadowCaster(treasureShape, true)
        }

        // If there's nothing to do, we're done!
        if (this.currentPuzzle.type === 'puzzle') {
            let pos = this.currentPuzzle.position.split(',')
            let sol = this.currentPuzzle.solution.split(',')
            let position = scaledVector3(pos[0], pos[1], pos[2])
            let solution = scaledVector3(sol[0], sol[1], sol[2])

            // Make the shapes
            var puzzleShapes = CreatePuzzle(this.currentPuzzle.shapes, this.shapeMat, this.scene)
            puzzleShapes.forEach((shape) => {
                shape.setParent(this.puzzleParent)
                // shape.position = position

                // if (this.currentPuzzle.rotated) {
                //     shape.rotateAround(new BABYLON.Vector3(position.x, shape.position.y, position.z), new BABYLON.Vector3(0,1,0), Math.PI * 0.25)
                // }
                // TODO: Shuffle the position/rotation of these
                shape.rotationQuaternion = BABYLON.Quaternion.FromEulerAngles(
                    Math.random() * 2 * Math.PI - Math.PI,
                    Math.random() * 2 * Math.PI - Math.PI,
                    Math.random() * 2 * Math.PI - Math.PI
                )
                this.shadowGenerator.getShadowMap().renderList.push(shape)
            })
            this.puzzleParent.position = position
            // if (this.currentPuzzle.rotated) this.puzzleParent.rotate(BABYLON.Vector3.Up(), Math.PI * 0.25)
            this.puzzleShapes = puzzleShapes
            
            // Make the solution template
            var solutionShape = CreatePuzzleShape(this.currentPuzzle.shapes[0], 'z', this.scene)
            solutionShape.position = position.add(solution)
            solutionShape.material = CreateColorMaterial('#00ffff')
            solutionShape.material.alpha = 0.3

            solutionShape.scaling.z = 0.01
            solutionShape.lookAt(position)
            this.solutionShape = solutionShape
        }

        messages.forEach((message) => { // turn on the proper nodes
            this.scene.getMeshByName(message.name).setEnabled(message.puzzles.includes(this.currentPuzzleIndex))
        })
    }
    CheckSolution() {
        var result = false
        if (this.currentPuzzle.type === 'treasure') {
            if (grabbedMesh && grabbedMesh.name.indexOf('Treasure' !== -1)) {
                result = true
                this.SetupNextPuzzle()
            }
        } else if (this.currentPuzzle.type === 'puzzle') { // Puzzle Shapes
            if (!this.puzzleShapes) return false
            var solved = this.puzzleShapes.every((puzzleShape) => {
                var quat = puzzleShape.rotationQuaternion
                var rot = (quat) ? quat.toEulerAngles() : puzzleShape.rotation
                return !(rot.x || rot.y || rot.z)
            })
            if (solved) {
                this.SetupNextPuzzle()
                result = true
            }
        } else if (this.currentPuzzle.type === 'rays') {
            let missed = false
            var lamp = this.scene.getMeshByName('Grabbable-Lamp-0')
            var hitMeshes = []
            this.lamps.forEach((lamp) => {
                let glow = lamp.getChildren().find((child) => {
                    return (child.name.indexOf("Glow") !== -1)
                })
                glow.material.alpha = 0.0
            })
            while (hitMeshes.length < 5 && !missed) {
                hitMeshes.push(lamp.id)
                let glow = lamp.getChildren().find((child) => {
                    return (child.name.indexOf("Glow") !== -1)
                })
                glow.material.alpha = 0.2
                let origin = lamp.position
                let direction = lamp.forward
                let length = 50
                let predicate = (mesh) => { 
                    if (mesh.name.indexOf('Glow') !== -1) return false
                    if (hitMeshes.indexOf(mesh.id) !== -1) return false
                    return true
                }
                direction = BABYLON.Vector3.Normalize(direction)
                var ray = new BABYLON.Ray(origin, direction, length)
                var hit = scene.pickWithRay(ray, predicate)
                // BABYLON.RayHelper.CreateAndShow(ray, scene, new BABYLON.Color3(1, 0, 0.1));
                if (hit.hit && hit.pickedMesh.name.indexOf('Lamp') !== -1) {
                    lamp = hit.pickedMesh
                } else {
                    glow.scaling.y = (hit.hit) ? hit.distance : length
                    missed = true
                }
            }
            if (hitMeshes.length == 4) {
                if (gameManager.currentPuzzle.type == 'rays')
                    gameManager.SetupNextPuzzle()
            }
            // TODO: Multiply ambient light in room by number of hit lamps
        } else if (this.currentPuzzle.type === 'useScarab') {
            var scarab = this.scene.getMeshByName('Holdable-Treasure')
            var distance = scarab.absolutePosition.subtract(scaledVector3(40, scarab.position.y ,0)).length()
            if (distance < 1.5) {
                this.SetupNextPuzzle()
            }
        }
        return result
    }
}
const gameManager = new GameManager()

var CreatePuzzleShape = (shapeObject, axis, scene) => {
    let puzzle = shapeObject.points
    let shouldMirror = shapeObject.shouldMirror
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
            if (shouldMirror)
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

var CreateColorMaterial = (colorHex, scene) => {
    if (materials[colorHex]) return materials[colorHex]
    // Make the shape material
    var tex = new BABYLON.DynamicTexture("Texture-" + colorHex, {width:512, height:512}, scene);
    var ctx = tex.getContext();
    var mat = new BABYLON.StandardMaterial("Material-" + colorHex, scene);
    mat.diffuseTexture = tex;
    ctx.fillStyle = colorHex;
    ctx.fillRect(0,0, 512, 512);
    tex.update()
    materials[colorHex] = mat
    return mat
}

var CreateBillboardMaterial = (lines, colorHex, scene) => {
    let mat = billboardMaterial || new BABYLON.StandardMaterial("Material-" + colorHex, scene);
    let tex = mat.diffuseTexture || new BABYLON.DynamicTexture("Texture-" + colorHex, {width:1280, height:720}, scene);
    // Make the shape material
    tex.hasAlpha = true
    var ctx = tex.getContext();
    mat.diffuseTexture = tex;
    mat.backFaceCulling = false
    mat.emissiveColor = new BABYLON.Color3(.2, .2, .2)

    ctx.clearRect(0, 0, tex.getSize().width, tex.getSize().height)
    
    lines.forEach((line, i) => {
        ctx.font = "bold 86px serif"
        // Shadow
        ctx.fillStyle = '#333'
        ctx.fillText(line, 0 + 4, 128 + 4 + i * 114)

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(line, 0, 128 + i * 114)

    })

    tex.update()
    materials[colorHex] = mat
    return mat
}



var CreatePuzzle = function(shapeArrays, shapeMat, scene) {
    var axes = ['x', 'z', 'y']
    var shapeMeshes = []
    var shapeCSGs = []
    var resultMeshes = []
    // Make a mesh from each of the shapeArrays
    shapeArrays.forEach((shape, i) => {
        var shapeMesh = CreatePuzzleShape(shape, axes[i], scene)
        shapeMeshes.push(shapeMesh)
    })
    // Make CSG from each
    // Combine using intersect
    let resultCSG = null
    shapeMeshes.forEach((shapeMesh) => {
        let shapeCSG = BABYLON.CSG.FromMesh(shapeMesh)
        if (!resultCSG) resultCSG = shapeCSG
        else {
            resultCSG.intersectInPlace(shapeCSG)
        }
    })

    // Use a box to split it into four chunks
    var topStamp = BABYLON.MeshBuilder.CreateBox('Box-Stamp', {
        size: 0.52
    }, scene)
    
    var positions = [
        scaledVector3(0.25, 0.25, 0.25, 1),
        scaledVector3(-0.25, 0.25, -0.25, 1),
        scaledVector3(0.25, -0.25, -0.25, 1),
        scaledVector3(-0.25, -0.25, 0.25, 1)
    ]


    positions.forEach((pivotPoint, i) => {
        topStamp.position = pivotPoint
        let shapeCSG = resultCSG.intersect(BABYLON.CSG.FromMesh(topStamp))
        var shapeMesh = shapeCSG.toMesh('Grabbable-Puzzle-' + i, shapeMat, scene, true)
        // Move the pivot to teh right spot
        shapeMesh.setPivotPoint(pivotPoint)
        resultMeshes.push(shapeMesh)
    })
    // resultMeshes.push(resultCSG.toMesh('Grabbable-Test-Shape', shapeMat, scene, false))
    topStamp.dispose()
    shapeMeshes.forEach((mesh) => mesh.dispose())
    // Every puzzle will do the same four blocks
    // return an array of meshes with their pivot point set
    return resultMeshes
}

var createScene = () => {
    // Scene and camera
    var scene = new BABYLON.Scene(engine)
    scene.collisionsEnabled = true
    var camera = new BABYLON.UniversalCamera('Camera',
        scaledVector3(-500, 5, 0),
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
    // ctx.fillStyle = 'black'
    // ctx.fillRect(192, 192, 128, 128)
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

    // A bunch of columns leading to the pyramid
    var mat = new BABYLON.StandardMaterial('std', scene);
    mat.ambientColor = new BABYLON.Color4(0.4, 0.4, 0.4, 0.922)
    mat.diffuseColor = new BABYLON.Color4(0.829, 0.829, 0.829, 0.922)
    mat.specularColor = new BABYLON.Color4(0.296648, 0.296648, 0.296648, 0.922 )
    for(let i = 0; i < 6; i++) {
        var pillar = BABYLON.MeshBuilder.CreateCylinder('Pillar-North-' + i, {
            height: 40,
            diameterTop: 20 * GRID_TO_UNITS,
            diameterBottom: 20 * GRID_TO_UNITS
        }, scene)
        pillar.position.x = -100 * i * GRID_TO_UNITS - 30
        pillar.position.y = 20
        pillar.position.z = 100 * GRID_TO_UNITS
        pillar.material = mat 

        var pillar2 = pillar.clone('Pillar-South-'+ i)
        pillar2.position.z = -100 * GRID_TO_UNITS
    }


    // Wall
    var wall1 = BABYLON.MeshBuilder.CreateBox('Door-1', {
        size: 1,
        faceColors: [
            COLOR_GREY,
            COLOR_GREY,
            COLOR_GREY,
            COLOR_GREY,
            COLOR_GREY,
            COLOR_GREY
        ]
    }, scene)
    wall1.scaling = scaledVector3(3, 9, 6)
    wall1.position = scaledVector3(11, 4.49, 0)
    wall1.checkCollisions = true
    wall1.receiveShadows = true

    var wall2 = wall1.clone('Door-2')
    wall2.position = scaledVector3(50, 6.01, 0)
    wall2.scaling = scaledVector3(3, 12, 24)
    wall2.checkCollisions = true
    wall2.receiveShadows = true

    var wall3 = BABYLON.MeshBuilder.CreateCylinder('Door-Treasure', {
        height: 9 * GRID_TO_UNITS,
        diameterTop: 0,
        diameterBottom: 17 * GRID_TO_UNITS,
        tessellation: 4
    }, scene)

    wall3.position.x = 100 * GRID_TO_UNITS
    wall3.position.y = 4.5 * GRID_TO_UNITS

    wall3.checkCollisions = true
    wall3.receiveShadows = true

    var columnSW = wall1.clone('Column-SW')
    columnSW.position = scaledVector3(33, 10, -7)
    columnSW.scaling = scaledVector3(3, 20, 3)
    columnSW.rotate(new BABYLON.Vector3(0, 1, 0), Math.PI * 0.25)
    columnSW.receiveShadows = true

    var columnNW = columnSW.clone('Column-NW')
    columnNW.position = scaledVector3(33, 10, 7)
    columnNW.receiveShadows = true
    

    var treasureShape = CreatePuzzleShape(scarabShape, 'x', scene)
    treasureShape.material = new BABYLON.StandardMaterial("TreasureMaterial", scene)
    treasureShape.position = scaledVector3(100, 4.5, 0)
    treasureShape.scaling = scaledVector3(0.25, 1, 1)
    treasureShape.name = 'Holdable-Treasure'

    // Gold
    treasureShape.material.ambientColor = new BABYLON.Color3(0.24, 0.22, 0.06)
    treasureShape.material.diffuseColor = new BABYLON.Color3(0.34, 0.31, .09)
    treasureShape.material.specularColor = new BABYLON.Color3(0.797, 0.724, .21)
    treasureShape.material.emissiveColor = new BABYLON.Color4(.1, .1, .1, 1)
    BABYLON.Animation.CreateAndStartAnimation('float', treasureShape, 'rotation.y', 30, 120, 0, Math.PI * 2, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
    




    // Sky
    var stars = BABYLON.Mesh.CreateSphere('stars', 100, 1000, scene)
    stars.material = materialSky

    // Moon
    var moon = BABYLON.Mesh.CreateSphere('moon', 100, 75, scene)
    var materialMoon = new BABYLON.StandardMaterial("MoonMaterial", scene)
    moon.position.x = -500
    moon.position.y = 50
    moon.material = materialMoon
    moon.material.emissiveColor = new BABYLON.Color3(0.97, 0.94, 0.94)
    
    // Place a node for each message
    messages.forEach((message) => {
        let node = BABYLON.MeshBuilder.CreateIcoSphere(message.name, {
            radius: 0.15
        }, scene)
        node.position = message.position
        node.material = materialMoon
        node.material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2)
        BABYLON.Animation.CreateAndStartAnimation('float', node, 'rotation.y', 30, 120, 0, Math.PI * 2, BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
        node.setEnabled(false)
    })

    // Message text node
    var billboard = BABYLON.MeshBuilder.CreatePlane('billboard', {
        width: 16,
        height: 9,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    }, scene)
    billboard.renderingGroupId = 1
    billboard.scaling = new BABYLON.Vector3(.125, .125, .125)
    billboard.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y
    billboard.material = CreateBillboardMaterial(messages[0].lines, '#999', scene)
    billboard.setEnabled(false)
    
    scene.registerBeforeRender(() => {
        // gameManager.puzzleParent.rotate(BABYLON.Vector3.Up(), Math.PI / 180)
    })

    // Used for grabbing and rotating shapes
    scene.onBeforeRenderObservable.add(() => {

        // Update the grabbed object
        if (grabbedMesh && grabbingController) {
            // Put it on the user's hand
            if (grabbedMesh.name.indexOf('Holdable') !== -1) {
                // grabbedMesh.position = grabbingController.devicePosition
                // grabbingController.mesh.addChild(grabbedMesh)
                grabbedMesh.position = grabbingController.mesh.position.clone()
                grabbedMesh.position = grabbedMesh.position.subtract(grabbingController.mesh.forward)
                // grabbedMesh.rotationQuaternion = grabbingController.rotationQuaternion 
            }

            // Rotation
            if (grabbedMesh.name.indexOf('Grabbable') !== -1 || 
                grabbedMesh.name.indexOf('Holdable') !== -1 ) {
                var currentDeviceQuaternion = grabbingController.deviceRotationQuaternion.clone()
                if (startDeviceQuaternion && startMeshQuaternion) {
                    var differenceQuat = currentDeviceQuaternion.multiply(BABYLON.Quaternion.Inverse(startDeviceQuaternion))
                    
                    var quat = differenceQuat.multiply(startMeshQuaternion)
                    var rot = quat.toEulerAngles()
                    rotRounded = roundToDegrees(rot, 15)
                    // 15 degrees is Math.PI / 12 radians
                    grabbedMesh.rotationQuaternion = BABYLON.Quaternion.FromEulerVector(rotRounded)
                }
            }


            // Lamp-0 should cast a ray, if it hits a Lamp, repeat
            if (grabbedMesh.name.indexOf('Lamp') !== -1) {
                gameManager.raycastCooldown--
                if (gameManager.raycastCooldown < 0) {
                    gameManager.raycastCooldown = RAYCAST_COOLDOWN

                    gameManager.CheckSolution()
                }
            }
        }

    })

    // The pyramid
    var building = BABYLON.MeshBuilder.CreateCylinder('Building-Outside', {
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
    mat.ambientColor = new BABYLON.Color4(0.4, 0.4, 0.4, 0.922)
    mat.diffuseColor = new BABYLON.Color4(0.829, 0.829, 0.829, 0.922)
    mat.specularColor = new BABYLON.Color4(0.296648, 0.296648, 0.296648, 0.922 )

    // mat.alpha = 0.7;

    var FullBuilding = buildingCSG.toMesh('Building', mat, scene, false);
    FullBuilding.receiveShadows = true
    building.dispose()
    roomStamp.dispose()
    FullBuilding.checkCollisions = true

    // Place some spinnable lights
    var lamp = BABYLON.MeshBuilder.CreateIcoSphere('Grabbable-Lamp-0', {
        radius: 0.52,
        subdivisions: 1
    }, scene)
    lamp.material = new BABYLON.StandardMaterial('Grabbable-Lamp-Material', scene);
    // Emerald
    lamp.material.ambientColor = new BABYLON.Color4(.0215, 0.1745, .0215, 0.55)
    lamp.material.diffuseColor = new BABYLON.Color4(.07568, .61424, .07568, 0.55)
    lamp.material.specularColor = new BABYLON.Color4(.633, .7278, .633, 0.55)
    lamp.material.alpha = 0.7
    
    var glow = BABYLON.MeshBuilder.CreateCylinder('Glow', {
        height: 1,
        diameterTop: 0.3,
        diameterBottom: 0.1,
        tessellation: 12,
        cap: BABYLON.Mesh.NO_CAP
    }, scene)
    glow.setPivotPoint(new BABYLON.Vector3(0, -0.5, 0))
    glow.position.y = -0.25
    glow.rotate(new BABYLON.Vector3(1, 0, 0), Math.PI * 0.5)
    glow.material = new BABYLON.StandardMaterial('Grabbable-Glow-Material', scene);
    glow.material.alpha = 0.0
    glow.material.emissiveColor = new BABYLON.Color3(0.97, 0.94, 0.94)
    // // Emerald
    glow.material.ambientColor = new BABYLON.Color4(.0215, 0.1745, .0215, 0.55)
    glow.material.diffuseColor = new BABYLON.Color4(.07568, .61424, .07568, 0.55)
    glow.material.specularColor = new BABYLON.Color4(.633, .7278, .633, 0.55)

    
    var lamp1 = lamp.clone('Grabbable-Lamp-1')
    var lamp2 = lamp.clone('Grabbable-Lamp-2')
    var lamp3 = lamp.clone('Grabbable-Lamp-3')
    gameManager.lamps.push(lamp1, lamp2, lamp3)
    var glow1 = glow.clone('Glow-1')
    glow1.material = glow1.material.clone()
    var glow2 = glow.clone('Glow-2')
    glow2.material = glow.material.clone()
    var glow3 = glow.clone('Glow-3')
    glow3.material = glow.material.clone()
    glow.material.alpha = 0.2
    glow.scaling.y = 50

    lamp.addChild(glow)
    glow.position = scaledVector3(0, 0.5, -0.25, 1)
    lamp1.addChild(glow1)
    glow1.position = scaledVector3(0, 0.5, -0.25, 1)
    lamp2.addChild(glow2)
    glow2.position = scaledVector3(0, 0.5, -0.25, 1)
    lamp3.addChild(glow3)
    glow3.position = scaledVector3(0, 0.5, -0.25, 1)

    lamp.position = scaledVector3(55, 3, 0)
    lamp1.position = scaledVector3(85, 3, 30)
    // lamp1.position = scaledVector3(100, 5, 45)
    lamp2.position = scaledVector3(85, 3, -30)
    lamp3.position = scaledVector3(85, 33, 0)
    lamp.lookAt(treasureShape.position)
    lamp2.lookAt(treasureShape.position)
    lamp3.lookAt(treasureShape.position)
    lamp1.lookAt(treasureShape.position)
    return scene
}

var scene = createScene()
gameManager.scene = scene

// Lights
var light = new BABYLON.DirectionalLight('light2', new BABYLON.Vector3(1,0,0), scene)
light.position.x = -500
light.intensity = 0.2

var light1 = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(-1, 1, 0.01), scene)
light1.intensity = 0.5 // 0.5
gameManager.light = light1

// Shadows
var shadowGenerator = new BABYLON.ShadowGenerator(2048, light);
gameManager.shadowGenerator = shadowGenerator

// gameManager.shapeMat = CreateColorMaterial('#3c7681', scene)
var shapeMat = new BABYLON.StandardMaterial("Material-Shape", scene);

// Obsidian
shapeMat.ambientColor = new BABYLON.Color4(0.05375, 0.05, 0.06625, 0.82)
shapeMat.diffuseColor = new BABYLON.Color4(0.18275, 0.17, 0.22525, 0.82)
shapeMat.specularColor = new BABYLON.Color4(0.332741, 0.328634, 0.346435, 0.82 )
gameManager.shapeMat = shapeMat

gameManager.SetupNextPuzzle()


// VR Stuff
var vrHelper = scene.createDefaultVRExperience({
    createDeviceOrientationCamera: false,
    laserToggle: false
});

let floorMeshes = scene.meshes.filter(m => m.name.indexOf('Ground') !== -1)
vrHelper.enableTeleportation({floorMeshes: floorMeshes});

vrHelper.enableInteractions()
// What meshes to interact with
vrHelper.raySelectionPredicate = (mesh) => {
    if (mesh.name.indexOf('Grabbable') !== -1) return true
    if (mesh.name.indexOf('Holdable') !== -1) return true
    if (mesh.name.indexOf('Ground') !== -1) return true
    if (mesh.name.indexOf('Message') !== -1) {
        if (mesh.isEnabled())
        return true
    }
    if (mesh.name.indexOf('Door') !== -1) return true // Prevent teleporting/grabbing through walls
    return false
};

vrHelper.onAfterEnteringVRObservable.add(() => {
    // Move the camera to the blocks and look at it
})

// Keep track of the selected mesh
vrHelper.onNewMeshSelected.add((mesh) => {
    if (!mesh) return
    if (mesh.name.indexOf('Message') !== -1) {
        var message = messages.find((message) => message.name === mesh.name)
        var billboard = scene.getMeshByName('billboard')
        billboard.position = mesh.position.clone()
        billboard.material = CreateBillboardMaterial(message.lines, '#333', scene)
        billboard.setEnabled(true)
    }
    if (mesh.name.indexOf('Grabbable') === -1 &&
        mesh.name.indexOf('Holdable') === -1) return
    selectedMesh = mesh;
});

vrHelper.onSelectedMeshUnselected.add(() => {
    var billboard = scene.getMeshByName('billboard')
    if (billboard) billboard.setEnabled(false)
    selectedMesh = undefined;
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
        if(!grabbedMesh && stateObject.value > 0.1){ // Trigger started
            if (selectedMesh !== undefined) {
                // Only grab grabbable
                grabbedMesh = selectedMesh
                if (clonedMesh) clonedMesh.dispose()
                clonedMesh = grabbedMesh.clone("Clone")
                clonedMesh.material = clonedMesh.material.clone()
                clonedMesh.material.alpha = 0.5
                clonedMesh.position = webVRController.devicePosition.clone()
                clonedMesh.setParent(webVRController.mesh)
                clonedMesh.position = clonedMesh.getPivotPoint().negate()
                clonedMesh.scaling = clonedMesh.scaling.clone().scale(0.5)
                startDeviceQuaternion = webVRController.deviceRotationQuaternion.clone()
                startMeshQuaternion = (grabbedMesh.rotationQuaternion) ? grabbedMesh.rotationQuaternion.clone() : BABYLON.Quaternion.FromEulerVector(grabbedMesh.rotation)
                grabbingController = webVRController
                vrHelper.displayLaserPointer = false
                gameManager.CheckSolution()
            }
        //ungrab   
        } else if (grabbedMesh && stateObject.value <= 0.1) { // Trigger ended
            if (grabbedMesh) {
                lastDeviceQuaternion = undefined
                lastDevicePosition = undefined
                gameManager.CheckSolution()
            }
            if (clonedMesh) {
                clonedMesh.dispose()
            }
            grabbedMesh = null
            grabbingController = null
            vrHelper.displayLaserPointer = true
        }
    });
});

engine.runRenderLoop(() => {
    scene.render()
})

window.addEventListener('resize', () => {
    engine.resize()
})

// document.addEventListener('keypress', (e) => {
//     if (e.keyCode == 32) {
//         gameManager.SetupNextPuzzle()
//     }
// })
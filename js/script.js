var renderer, scene, sceneCube, camera, mesh, meshw, texture_placeholder, texture, water, treeGeometry, treeGeometry2, treeMaterial;
var clock = new THREE.Clock();
init();
animate();

function init(){
    if (!Detector.webgl) Detector.addGetWebGLMessage();

    // Initialisation webGl
    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    // Initialisation de la scene
    scene = new THREE.Scene();

    // Initialisation de la camera : position + vue + mouvement
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(-2879, 300, 104);
    controls = new THREE.FirstPersonControls(camera);
    controls.movementSpeed = 1000;
    controls.lookSpeed = 0.1;
    controls.lookVertical = false;
    scene.add(camera);

    // Ajout de lumières
    var h =0.995, s = 0.5, l = 0.9, x = -250, y = 1400, z = 600, d = 50;
    var ambient = new THREE.AmbientLight(0x444444);
    scene.add(ambient);

    light = new THREE.SpotLight(0x444444, 1, 0, Math.PI, 1);
    light.position.set(x, y, z);
    light.target.position.set(-2879, 300, 104);

    light.castShadow = true;
    light.shadowCameraNear = 700;
    light.shadowCameraFar = camera.far;
    light.shadowCameraFov = d;
    light.shadowBias = 0.0001;
    light.shadowDarkness = 0.5;
    light.shadowMapWidth = 4000;
    light.shadowMapHeight = 4000;

    scene.add( light );

    // Soleil
    var textureFlare0 = THREE.ImageUtils.loadTexture('/lab/webgl/images/lensflare0.png');
    var textureFlare2 = THREE.ImageUtils.loadTexture('/lab/webgl/images/lensflare2.png');
    var textureFlare3 = THREE.ImageUtils.loadTexture('/lab/webgl/images/lensflare3.png');
    var light = new THREE.PointLight(0xffffff, 1.5, 4500);
    light.color.setHSL(h, s, l);
    light.position.set(x, y, z);
    scene.add(light);

    var flareColor = new THREE.Color(0xffffff);
    flareColor.setHSL(h, s, l + 0.5);

    var lensFlare = new THREE.LensFlare(textureFlare0, 700, 0.0, THREE.AdditiveBlending, flareColor);

    lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
    lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);
    lensFlare.add(textureFlare2, 512, 0.0, THREE.AdditiveBlending);

    lensFlare.add(textureFlare3, 60, 0.6, THREE.AdditiveBlending);
    lensFlare.add(textureFlare3, 70, 0.7, THREE.AdditiveBlending);
    lensFlare.add(textureFlare3, 120, 0.9, THREE.AdditiveBlending);
    lensFlare.add(textureFlare3, 70, 1.0, THREE.AdditiveBlending);

    lensFlare.customUpdateCallback = lensFlareUpdateCallback;
    lensFlare.position = light.position;

    scene.add(lensFlare);

    // Terrain
    var worldWidth = worldDepth = 128;
    var heightMap = getHeightMap();
    var geometry = new THREE.PlaneGeometry(7500, 7500, worldWidth - 1, worldDepth - 1);
    geometry.applyMatrix(new THREE.Matrix4().makeRotationX(- Math.PI / 2));
    for (var i = 0, l = geometry.vertices.length; i < l; i ++) {
        geometry.vertices[i].y = heightMap[i] * 50;
    }
    var ground = THREE.ImageUtils.loadTexture('/lab/webgl/images/grass.jpg');
    ground.wrapS = ground.wrapT = THREE.RepeatWrapping;
    ground.repeat.set(50, 50);
    var mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({map: ground, shading: THREE.SmoothShading, side: THREE.DoubleSide}));
    scene.add(mesh);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Arbres
    treeGeometry = new THREE.PlaneGeometry(200, 200, 1, 4);
    treeGeometry2 = new THREE.PlaneGeometry(200, 200, 1, 4);
    treeGeometry2.applyMatrix(new THREE.Matrix4().makeRotationY(- Math.PI / 2));
    treeMaterial = new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture('/lab/webgl/images/tree.png'), alphaTest: 0.8, side: THREE.DoubleSide});
    for ( var i = 0; i < 1000; i ++ ) {
        var x = Math.random() * 8000 - 4000;
        var z = Math.random() * 8000 - 4000;
        var vector = new THREE.Vector3(x, 0, z);
        var vector2 = new THREE.Vector3(x, 2000, z);
        var raycaster = new THREE.Raycaster(vector, vector2.sub(vector).normalize());
        var groundIntersects = raycaster.intersectObject(mesh);
        if(groundIntersects.length) {
            if(groundIntersects[0].point.y > 400) {
                addThree(x, groundIntersects[0].point.y + 100, z);
            } 
        }
    }

    // Ciel
    var urls = [
        '/lab/webgl/images/skybox_right.jpg',
        '/lab/webgl/images/skybox_left.jpg',
        '/lab/webgl/images/skybox_top.jpg',
        '/lab/webgl/images/skybox_bottom.jpg',
        '/lab/webgl/images/skybox_back.jpg',
        '/lab/webgl/images/skybox_front.jpg'
    ];
    var reflectionCube = THREE.ImageUtils.loadTextureCube(urls);
    reflectionCube.format = THREE.RGBFormat;

    var shader = THREE.ShaderLib['cube'];
    shader.uniforms['tCube'].value = reflectionCube;
    var material = new THREE.ShaderMaterial( {
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: shader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
    } );

    meshs = new THREE.Mesh(new THREE.CubeGeometry(7500, 7500, 7500), material);
    scene.add(meshs);

    // Mer
    water = new THREE.PlaneGeometry(7500, 7500, worldWidth - 1, worldDepth - 1);
    water.applyMatrix(new THREE.Matrix4().makeRotationX(- Math.PI / 2));
    var waterMaterial = new THREE.MeshPhongMaterial({color: 0x000000, specular: 0xd2cfb9, ambient: 0x1a1d21, envMap: reflectionCube, combine: THREE.MixOperation, reflectivity: 0.5, shininess: 20, shading: THREE.SmoothShading});
    meshw = new THREE.Mesh(water, waterMaterial);
    meshw.position.y = 220;
    meshw.receiveShadow = true;
    scene.add(meshw);

 
    // Brouillard
    scene.fog = new THREE.Fog( 0x34583e, 0, 10000 );

    // Rendu de la scène
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.physicallyBasedShading = true;
    renderer.shadowMapEnabled = true;
    renderer.shadowMapType = THREE.PCFShadowMap;
    renderer.render(scene, camera);
}

// Récupère les inforations pixels d'une images pour définir le "vallonage" du terrain 
function getHeightMap() {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    var context = canvas.getContext('2d');

    var size = 128 * 128, data = new Float32Array(size);

    var img = document.getElementById('heightmap');
    context.drawImage(img,0,0);

    for (var i = 0; i < size; i ++) {
        data[i] = 0
    }

    var imgd = context.getImageData(0, 0, canvas.width, canvas.height);
    var pix = imgd.data;

    var j=0;
    for (var i = 0, n = pix.length; i < n; i += (4)) {
        var all = pix[i]+pix[i+1]+pix[i+2];
        data[j++] = all/30;
    }

    return data;
}

function lensFlareUpdateCallback( object ) {
    var f, fl = object.lensFlares.length;
    var flare;
    var vecX = -object.positionScreen.x * 2;
    var vecY = -object.positionScreen.y * 2;
    for( f = 0; f < fl; f++ ) {
        flare = object.lensFlares[ f ];
        flare.x = object.positionScreen.x + vecX * flare.distance;
        flare.y = object.positionScreen.y + vecY * flare.distance;
        flare.rotation = 0;
    }

    object.lensFlares[2].y += 0.025;
    object.lensFlares[3].rotation = object.positionScreen.x * 0.5 + THREE.Math.degToRad(45);
}

function addThree(x, y, z) {
    var treeMesh = new THREE.Mesh(treeGeometry, treeMaterial);
    var treeMesh2 = new THREE.Mesh(treeGeometry2, treeMaterial);
    treeMesh.position.y = treeMesh2.position.y = y;
    treeMesh.position.x = treeMesh2.position.x = x;
    treeMesh.position.z = treeMesh2.position.z = z;
    scene.add(treeMesh);
    scene.add(treeMesh2);
}

function animate(){
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update(clock.getDelta());
}
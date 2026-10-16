import * as THREE from 'three';
import { generateTrainingLayout } from '../public/modules/environment/training/layout.js';
import { trainingHeightAt } from '../public/modules/environment/training/world-plan.js';
import { obstacleHasCollision } from '../public/modules/physics/collisions.js';

test('terrain collision follows local elevation, leaving the launch corridor and air above hills clear',()=>{
    const layout=generateTrainingLayout({profile:'hills',seed:341});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(layout.size,layout.size),new THREE.MeshBasicMaterial());
    mesh.userData.trainingGround=layout;
    expect(obstacleHasCollision(mesh,[new THREE.Vector3(0,0,.3)])).toBe(false);
    let peak={x:0,y:0,z:0};
    for (let x=-80;x<80;x+=2) for(let y=-80;y<80;y+=2) {
        const z=trainingHeightAt(layout,x,y); if(z>peak.z) peak={x,y,z};
    }
    expect(peak.z).toBeGreaterThan(1);
    expect(obstacleHasCollision(mesh,[new THREE.Vector3(peak.x,peak.y,peak.z-.1)])).toBe(true);
    expect(obstacleHasCollision(mesh,[new THREE.Vector3(peak.x,peak.y,peak.z+.5)])).toBe(false);
    mesh.position.set(25,10,0);
    expect(obstacleHasCollision(mesh,[new THREE.Vector3(peak.x+25,peak.y+10,peak.z-.1)])).toBe(true);
});

test('water is a landing hazard while surrounding dry ground remains usable',()=>{
    const layout=generateTrainingLayout({profile:'mixed',seed:341});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(layout.size,layout.size),new THREE.MeshBasicMaterial());
    mesh.userData.trainingGround=layout;
    const river=layout.water[0].points[12];
    expect(obstacleHasCollision(mesh,[new THREE.Vector3(river.x,river.y,.1)])).toBe(true);
    expect(obstacleHasCollision(mesh,[new THREE.Vector3(river.x,river.y,3)])).toBe(false);
    expect(obstacleHasCollision(mesh,[new THREE.Vector3(0,0,.1)])).toBe(false);
});

test('instanced trees collide per trunk/crown envelope, never across the entire forest bounding box',()=>{
    const forest=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,4),new THREE.MeshBasicMaterial(),2);
    forest.userData.trainingTrees=[{x:-20,y:0,z:0,radius:1,height:4},{x:20,y:0,z:0,radius:1,height:4}];
    expect(obstacleHasCollision(forest,[new THREE.Vector3(0,0,2)])).toBe(false);
    expect(obstacleHasCollision(forest,[new THREE.Vector3(20,.5,2)])).toBe(true);
    expect(obstacleHasCollision(forest,[new THREE.Vector3(20,0,6)])).toBe(false);
});

test('decorative terrain layers explicitly opt out of collisions',()=>{
    const detail=new THREE.Group(); detail.userData.collidable=false;
    detail.add(new THREE.Mesh(new THREE.BoxGeometry(100,100,20),new THREE.MeshBasicMaterial()));
    const root=new THREE.Group();root.add(detail);
    expect(obstacleHasCollision(root,[new THREE.Vector3(0,0,2)])).toBe(false);
});

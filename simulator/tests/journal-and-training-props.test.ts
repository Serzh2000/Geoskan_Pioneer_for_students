import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {filterJournal,isTechnicalLog} from '../public/modules/shared/logging/journal.js';
import type {LogRecord} from '../public/modules/shared/logging/logger.js';

test('technical noise is optional; warnings and script output remain visible',()=>{
 const entries:LogRecord[]=[
  {time:'12:00',tag:'[3D-CLICK]',message:'pointerup',tone:'info',category:'scene'},
  {time:'12:00',tag:'[GUIDE]',message:'panel_render | visible=false',tone:'info',category:'guide'},
  {time:'12:00',tag:'[Lua print]',message:'Hello',tone:'info',category:'script'},
  {time:'12:00',tag:'[GUIDE]',message:'launch_failed',tone:'error',category:'guide'}
 ];
 expect(filterJournal(entries,{query:'',source:'all',level:'all',technical:false})).toEqual(entries.slice(2));
 expect(filterJournal(entries,{query:' HELLO ',source:'script',level:'all',technical:true})).toEqual([entries[2]]);
 expect(isTechnicalLog(entries[3])).toBe(false);
});

test('Blender export is Z-up, grounded, complete and within the geometry budget',async()=>{
 const bytes=readFileSync('public/assets/models/props/training-props-v2.glb');
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,'');
 const names=['Cargo','Transport','ControlStation','VideoTower','LightTower','BuildingFloor','BuildingRoof','WindowModule','EntranceModule'];
 let total=0;
 for(const name of names){
  const root=gltf.scene.getObjectByName(`V2_${name}`)!; expect(root).toBeDefined();
  let meshes=0;
  root.traverse(o=>{if(o instanceof THREE.Mesh){meshes++; total+=(o.geometry.index?.count || o.geometry.attributes.position.count)/3;}});
  expect(meshes).toBeGreaterThan(0); expect(meshes).toBeLessThanOrEqual(16);
  if(['Cargo','Transport','ControlStation','VideoTower','LightTower'].includes(name)){
   const b=new THREE.Box3().setFromObject(root); expect(b.min.z).toBeGreaterThanOrEqual(-.01); expect(b.min.z).toBeLessThan(.05);
   if(name.endsWith('Tower')) expect(b.max.z).toBeGreaterThan(3);
  }
 }
 expect(total).toBeLessThan(45000);
 expect(gltf.scene.children).toHaveLength(9);
});

// Check the rendered scene independently of the camera's obstruction calculation.
const { test, expect } = require("./support/game");

test.beforeEach(async ({ game }) => {
  await game.open();
  await game.driveOut();
  await game.park();
  await game.key("f");
  await game.eval(() => { window.__DTMAX=1e-9; });
});

for (const photo of [false,true]) {
  test((photo ? "Photo Mode" : "Walking camera")+" clears the bays, stairs and mezzanine", async ({ game }) => {
    const failures=await game.eval(photo=>{
      const samples=[[0,4,0],[0,12,0],[10,24,0],[22,15,0],[2,19.8,5.25],
        [12,20,5.25],[20.5,28.5,5.25],[-.65,27.4,5]];
      for(let i=0;i<10;i++) samples.push([-1.6,19.4+i*.9,.5+i*.5]);
      const cars=save.owned.map(id=>carMeshes[id]).filter(c=>c&&c!==pc&&c.G.visible);
      for(const c of cars){
        const p=new V3(1.7,0,0).applyAxisAngle(new V3(0,1,0),c.G.rotation.y).add(c.G.position);
        const l=houseLocal(p.x,p.z);samples.push([l.x,l.z,0]);
      }
      const errors=[],obstacles=[...HOUSE_MESHES];
      for(const c of cars)c.G.traverseVisible(obj=>{if(obj.isMesh)obstacles.push(obj)});
      scene.updateMatrixWorld(true);
      if(photo)photoEnter();
      for(const [x,z,h] of samples){
        const p=gW(x,z,h);Object.assign(FOOT,{x:p.x,y:p.y,z:p.z});
        for(let i=0;i<12;i++){
          FOOT.h=FOOT.cy=i*Math.PI/6;
          if(photo){photoReset();PH.dist=12;photoFrame(0)}else footCam(1/60,true);
          const eye=p.clone();eye.y+=photo?1:1.1;
          const dir=camera.position.clone().sub(eye),d=dir.length();
          const ray=new THREE.Raycaster(eye,dir.normalize(),.01,d-.01);
          const hit=ray.intersectObjects(obstacles,false).find(h=>h.object.visible&&h.object.material.visible);
          const lens=houseLocal(camera.position.x,camera.position.z);
          if(hit||d<.8||(photo&&h===5.25&&(lens.x<.49||lens.z<18.99||camera.position.y<gY+5.25)))
            errors.push({x,z,h,i,d,object:hit?.object.geometry.type});
        }
      }
      return errors.slice(0,8);
    },photo);
    expect(failures).toEqual([]);
  });
}

test("walking across an open doorway keeps the lens continuous in both directions",async ({game})=>{
  const jump=await game.eval(()=>{
    doorOpen=1;doorMesh.position.y=gY+9.6;
    let largest=0;
    for(const sign of [-1,1]){
      let last=null;
      for(let i=0;i<=80;i++){
        const p=gW(0,sign*(i/20-2));
        Object.assign(FOOT,{x:p.x,y:gY,z:p.z,h:sign*Math.PI/2,cy:sign*Math.PI/2});
        footCam(1/60,true);
        if(last)largest=Math.max(largest,last.distanceTo(camera.position));
        last=camera.position.clone();
      }
    }
    return largest;
  });
  expect(jump).toBeLessThan(.15);
});

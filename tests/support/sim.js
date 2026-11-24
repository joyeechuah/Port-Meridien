// Headless road and vehicle simulation. Each instance has a fresh island and player.
// Runs the shipping stepPlayer, surface sampling and keyboard inputs. Traffic, object
// collisions, screens and rendering remain the responsibility of the browser tests.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const THREE = require("three");

function section(file, start, end) {
  const source = fs.readFileSync(path.join(__dirname, "../../js", file + ".js"), "utf8");
  const first = source.indexOf(start);
  const last = source.indexOf(end, first + start.length);
  if (first < 0 || last < 0 || source.indexOf(start, first + start.length) >= 0) {
    throw new Error("Update the simulator source boundaries for " + file + ": " + start);
  }
  return source.slice(first, last);
}

function createDrivingSim() {
  const source = [
    '"use strict";',
    section("core", "const TAU=", "const isTouch="),
    section("core", "const CARS=", "// Cars taken from traffic"),
    section("world", "const HOUSE=", "function vegN("),
    section("world", "const TERR=", "function buildTerrain("),
    section("world", "const RT=", "/* ---------- routing"),
    section("world", "const trimA=", "// road pieces are queued"),
    section("cars", "function steerIn(", "// extra ride height"),
    section("cars", "const STEER_SENS=", "let repairWarnLevel="),
    // Construct the same desktop terrain height samples without generating colours,
    // textures or materials. Stop at the colour pass of buildTerrain.
    "function sampleTerrain(){",
    section("world", "  const SZ=2800,SEG=", "  for(let i=0;i<p.count;i++){\n"),
    "g.dispose();}",
    `const V3=THREE.Vector3, isTouch=false, keys={}, pad={}, GP={}, FOOT={stop:0};
     const save={side:"L",steer:1,assist:true,auto:false}, gps={route:null}, ev=null;
     let locked=false, autoHold=false, selected=CARS[0];
     const curCar=()=>selected, tiltSteer=()=>0;
     function attachCar(id){
       selected=CARS.find(car=>car.id===id);
       if(!selected)throw new Error("Unknown simulator car: "+id);
     }
     buildNetwork();buildRoadGrid();buildGroundGrid();sampleTerrain();
     return {P,save,keys,NODES,EDGES,RT,nearestRoad,edgePos,attachCar,driveUpdate:stepPlayer};`,
  ].join("\n");
  const build = vm.compileFunction(source, ["THREE"], { parsingContext: vm.createContext({}), filename: "port-meridien-sim.js" });
  return build(THREE);
}

module.exports = { createDrivingSim };

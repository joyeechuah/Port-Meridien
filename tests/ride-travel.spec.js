const { test, expect } = require("@playwright/test");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
test("travelling to the Auto Gallery by map ends a requested lift before moving the car", () => {
  const src = fs.readFileSync(path.join(__dirname,"../js/screens.js"),"utf8");
  const P={x:10,z:0}, RIDE={dest:{x:500,z:0}}, exits=[];
  const travel=vm.runInNewContext(src.slice(src.indexOf("function fastTravel("),src.indexOf("/* ---------- cameras"))+"\nfastTravel", {
    P,RIDE,closeMap(){},fadeThen:(_ms,done)=>done(),resetToRoad(){},
    rideEnd:()=>{exits.push(P.x);RIDE.dest=null}
  });
  travel({act:"dealer",x:500,z:0});
  expect(P.x).toBe(500);
  expect(exits).toEqual([10]);
  expect(RIDE.dest).toBeNull();
});

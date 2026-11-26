// The page the tests drive: the shipping index.html and its scripts in js/, read from disk on every run, with test
// hooks added in memory. The files themselves are never changed, so the tests always exercise the code players get.
//
// The hooks only add ways to look inside the game, plus two small helpers:
//   window.__T      read access to the game's internal state and functions, as live getters (the scripts' top-level
//                   names are global, but a const or let isn't a property of window, so this keeps one way in)
//   window.__DTMAX  raises the 0.05 s cap on a frame's time step (a slow drawn frame keeps its real length),
//                   and 1e-9 freezes the page's own frames
//   window.__WARP   runs the garage exit (state EXIT) that many times faster, up to __DTMAX a frame. The cap alone
//                   never sped it up: a fast frame's step is its real length, so every drive-out took the scene's
//                   full 4 s. The car is placed from the end of the path either way
//   window.__AUD    counts impact sounds
//   window.__NORENDER  set by a test before the page loads: the 3D scene is never drawn (much faster)
// Each edit must match exactly once across the scripts. If the game's code changes so that one no longer matches,
// the tests stop with a message saying which, rather than quietly testing something else.
const fs = require("fs");
const path = require("path");
const { ROOT, readPage, scriptFiles } = require("./source");

// internal names the tests read; each is exposed as a getter, so the value is always the live one, and a name
// that no longer exists fails only the tests that use it, with "<name> is not defined"
const NAMES = (
  "gYaw guestSeat GUEST_SEAT GUEST guestSync guestHangOut guestSpot talkInvite talkShow openRepair closeRepair clOverlayOpen netModel netDropModel netRender netOpen netInvite OUTFITS WANT_CATALOG wantsClean wantsSync wantEvent wantsReroll SKILL_RATE skillThreshold skillLevel skillsClean skillFactor moodPercent skillMetres skillDistance skillAward skillPhoto photoDayClean skillsOpen skillsClose HOME_ITEMS HOME_ORIGIN HOME_CELL HOME_COLS HOME_ROWS HOME_CAP HOME_CLEAR HOME_WALLS HOME_FLOORS homeFits homePlace homeMove homeTurn homeSell homeFinish homeClean homeProgress homeComfort homeHas homeUse homeGain homeWaitClean homeWaitLoad HV homeBuild hvOpen hvClose gY hvTap hvAim hvTurn hvSell hvPanel hvSpot hvCam homeRect homeById WORK workOpen workClose workStart workServe workTick workCancel workKey workPad workClean kitchenMeal RIDE RIDE_V RIDE_LINES rideWhy talkRide rideTick rideEnd rideBoard ridePrompt NEEDS NS SIT VISIT NEED_LOSS NEEDS_START needsTick needsAdd needsMood needsTip needsRest needsEat needsRace needsLoad needsCommit needsClean needsKey needsOfSave needsOpen needsClose needsLabel sitDown sitEnd kitchenText restSync padMenu clNeeds PAUSE_SUBS kphNow PEOPLE TALK TALKS talkPad talkSel clPeople talkOpen talkPick talkClose talkable rel relLabel lifeHurt PR_MAX curCarEnv carIndoors SONGS MUSIC WARM QUAY footClear PEDS PED_NODES PED_EDGES PED_V pedOn pedUpdate pedClear WANTED COP_V copClock crime copUpdate copDispatch copNav copLoseT copsChasing wantedBlock initCops copBump jobBlocked setLane OFFICER OFF_V exitSeq wantedHud copClear copCaught openDealer goGarage repairPanel GUN HEALTH gunPick gunFire gunFoot gunCar KITS copCarFire hurt knockedOut VIOL copStandDown AC AU BOATS CARS DEALER DEALER_MARK EDGES EVENTS FR GARAGE_CAP H HOUSE JOBS JOB_R LANDMARKS LANDMARK_REWARD MV " +
  "NODES P PASSPORT_BONUS PH PHOTO_LOOKS PZ RADARS RES ROADS JOB_PTS SAVE_KEY SHOW STARTERS TODS TRAFFIC VTL W " +
  "adaptRes applyDayNight attachCar camMode camera carById closeDealer closeMap curCar curId cycleCam dPick dSel " +
  "hint HINTS HINT_KEY hintHome hintsStored " +
  "FACES discoverLandmark drawMap driveUpdate collidePlayer showDamageSmoke spawnTraffic earn edgePos endTestDrive ev fastTravel finishEvent parkAll phTarget edgeY PIER BOAT BOAT_V onPier boatBoard boatLand boatEnd boatFree OGRID meshH obstaclesNear paintOf LEFT STREET takeTraffic takeLeft streetReset footTarget FOOT FOOT_V footExit footEnter footStopTick copOfficerIn carClearY kphNow footEnd footGround footPlace updateEvent endEvent fishT fitZoom " +
  "foam foundCount gPick gSel gW goDrive goGarage gps grassT groundH hudOn job jobEnd jobRestart jobStart " +
  "DIAG VRANGE resetResolutionSample jobTarget jobsClose jobsOpen keys mapToWorld mapZoomAt nearestRoad nearestRoadGlobal openDealer openIntro " +
  "openMap openMapPopup pad passportClose passportOpen pauseOff pauseOn pc persist photoCapture photoEnter " +
  "photoExit photoLook photoLookSet photoReset prNow promptAct renderer resetToRoad routeBetween save scene " +
  "POSTCARDS POSTCARD_REWARD POSTCARD_RADIUS postcardsClean postcardPickup collectionsOpen collectionsClose " +
  "POSTCARD_MARKS postcardTick buildPostcards " +
  "contractRank contractPay " +
  "VERGE vergeSites toast toastFit " +
  "personOf pedLook rnd pedRotate " +
  "talkGift giftGiven giftClean " +
  "GIFTS GIFT_PREFS giftMenu giftSync giftedClean " +
  "TRAITS traitsClean traitsApply hasTrait traitLoss " +
  "NET netAt netState netTick fbLoad FB_LOADS " +
  "seaT setGPS clearGPS setState skyClock skyU startEvent startTestDrive state streakReset testDrive " +
  "SAVE saveWrite saveTrim saveMark saveWhy " +
  "updatePrompt zoneAt Hf LM_R gates fadeThen layoutHUD show audioOn acResume musicWant photoFrame finishTestDrive gateOf trackRoute trackRouteFull mapMarkers CAMV snapCam DIFFS setDiff raceRewards GH ghostAt ghostTimeAt evDirs updateTraffic GP TILT steerIn STEER_SENS pollPad CUPS cupTimes cupsOpen PROF carShape bodyPaint LOOK cabinPaint GO garageWant garageCam HOUSE_MESHES SPOTS gW GO_STAGE custOpen custClose modsOf modCost MOD_OPTS carMeshes showMeshes getCar rebuildCar PLATE_TEX HD junctionAt RT TEDGES cupStart cupBlocked showResult SIDE buildHeroCar disposeHeroCar SHAPE_CACHE CAR_ENV ghostModel buildTrafficCar updateCarEnv rebuildCarModels tabStop tabIdle frame CL CLOUD_KEY FIREBASE_CONFIG fbAdapter clSync clProg clFresh clOpen lvlOf jobTick"
).split(/\s+/);

const EDITS = [
  {
    name: "test hooks after boot()",
    find: "\nboot();\n",
    replace:
      "\nboot();\nwindow.__T={" +
      NAMES.map((n) => `get ${n}(){return ${n}}`).join(",") +
      ",set camMode(v){camMode=v}};\n" +
      // logic tests switch 3D drawing off from the start (see game.js)
      "if(window.__NORENDER){renderer.__draw=renderer.render;renderer.render=function(){}}\n",
  },
  {
    name: "time step cap (window.__DTMAX)",
    find: ",dt=Math.min(.05,raw)",
    replace: ",dt=Math.min(window.__DTMAX||.05,state===\"EXIT\"&&window.__WARP?raw*window.__WARP:raw)",
  },
  {
    name: "impact sound counter (window.__AUD)",
    find: "function playThump(v){",
    replace: "function playThump(v){window.__AUD=(window.__AUD||0)+1;",
  },
];

function count(hay, needle) {
  let n = 0;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

// the page itself as shipped (the hooks are in the scripts)
function instrumentedPage() {
  return readPage();
}

// every script in js/ with the hooks added: {"js/core.js": text, ...}
function instrumentedScripts() {
  const files = scriptFiles();
  for (const e of EDITS) {
    const where = files.filter((f) => count(f.text, e.find) > 0), n = files.reduce((a, f) => a + count(f.text, e.find), 0);
    if (n !== 1)
      throw new Error(
        `tests/support/instrument.js: the "${e.name}" edit expects ${JSON.stringify(e.find)} once in the game's scripts, found ${n}` +
          (where.length ? ` (${where.map((f) => f.rel).join(", ")})` : "") + ". The game's code has changed there; update the edit to match."
      );
    where[0].text = where[0].text.replace(e.find, () => e.replace);
  }
  return Object.fromEntries(files.map((f) => [f.rel, f.text]));
}

module.exports = { instrumentedPage, instrumentedScripts, NAMES, ROOT };

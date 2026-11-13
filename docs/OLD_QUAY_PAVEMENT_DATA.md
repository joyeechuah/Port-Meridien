# Old Quay pavement data (proposal only)

This JSON captures **candidate** sidewalk-centre corners, crossing points, junction anchors and pedestrian entrances for the existing town street grid. It is not loaded by the game; no roads, boat, on-foot code, or collision geometry changed.

The north and south streets are at z=-120 and z=190, cross streets at x=560/620/690/760, and the main avenue has a *curved* authored path from (560,40) through (940,5). The candidate coordinates around that avenue are approximations, not a surveyed mesh. Resolve them against runtime `EDGES` and `footClear`/colliders before pedestrian implementation. Sidewalk centre offsets use 7 m (5.2 m road half-width plus approximately 1.8 m within the 2.8 m footway), pending geometry inspection.

There are six block-face sidewalk loops, twelve junction anchors, seventeen candidate mid-block crossings and seven proposed pedestrian entrances. Crossings have no traffic priority logic at this stage. The existing Auto Gallery entrance/forecourt is deliberately not moved. Pier walkability belongs to the boat PR and is not modeled here.

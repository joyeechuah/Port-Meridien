# Postcards of Port Meridien

Walk or run within 2.5 metres of a card to collect it. Driving, sailing, standing still, menus, fades and hidden or inactive tabs do not collect cards. A card stays found on reload. The twelfth distinct card awards 12,000 CR once, in the same save as the pickup. The collection pays credits directly. It gives no driving XP. A complete imported album receives no retroactive payment.

**Pause → Collections** shows a location clue for every missing card and the title of each collected card. The album travels with the chosen account save. Empty and pre-collection saves compare equally. Duplicate and unknown IDs are discarded on load.

## Marker placements

The catalogue in js/core.js provides stable IDs and world coordinates for Claude's markers. These sites sit about 1.3 m beyond the road edge on the side facing the island interior. The pickup radius reaches back to the road shoulder. Place the visible marker at footGround(x,z) and hide it when save.postcards contains its ID. Markers need no collider.

| ID | Postcard | Place | World x | World z |
|---|---|---|---:|---:|
| summit | The Ridge Line | Crown Ridge Summit | -229.7 | -164.5 |
| sentinel | Rock at Dusk | Sentinel Rock Lookout | -740.3 | 650.3 |
| switchback | One More Bend | The Hairpin | -115.2 | -355.9 |
| north-cape | North Wind | North Cape | 221.4 | -911.2 |
| south-cape | Southern Light | South Cape | 28.7 | 795.7 |
| east-cape | First Light | East Cape | 998.7 | 175.9 |
| west-cape | Last Light | West Cape | -851.0 | 250.3 |
| eastbank | Postmarked Eastbank | Eastbank | 461.8 | -511.4 |
| cedar | The Cedar Road | Cedar Heights | -506.7 | 456.2 |
| common | Common Ground | North Common | -95.1 | -677.5 |
| cove | Cove in Blue | East Cove | 603.1 | -390.2 |
| north-point | The Long Way Home | North Point | -23.6 | -829.3 |

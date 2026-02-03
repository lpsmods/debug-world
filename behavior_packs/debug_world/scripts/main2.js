import { world, BlockTypes, system } from "@minecraft/server";
const OVERWORLD = world.getDimension("overworld"),
  START = { x: 1, y: 63, z: 1 },
  MAX = 110,
  MARGIN = 1,
  cachedBlocks = [];
function sortBlocks(e, o) {
  const c = e.id.split(":")[0],
    l = o.id.split(":")[0];
  return "minecraft" === c && "minecraft" !== l
    ? -1
    : "minecraft" !== c && "minecraft" === l
      ? 1
      : e.id.localeCompare(o.id);
}
function getAllBlocks() {
  if (0 === cachedBlocks.length)
    for (const e of BlockTypes.getAll().sort(sortBlocks)) cachedBlocks.push(e);
  return cachedBlocks;
}
function placeBlock(e, o) {
  if ("debug:barrier" !== o) {
    OVERWORLD.setBlockType(e, o);
    for (let o = e.x - 1; o < e.x + 2; o++)
      for (let c = e.y - 1; c < e.y + 2; c++)
        for (let l = e.z - 1; l < e.z + 2; l++) {
          const e = { x: o, y: c, z: l },
            r = OVERWORLD.getBlock(e);
          (r && !r.isAir) || OVERWORLD.setBlockType(e, "debug:air");
        }
  }
}
function* placeBlocksGenerator() {
  var e = START.x,
    o = START.y,
    c = START.z;
  for (const r of getAllBlocks()) {
    var l = { x: e, y: o, z: c };
    try {
      placeBlock(l, r.id);
    } catch (o) {
      e = e - 1 + 1;
    }
    e < 110 ? (e = e + 1 + 1) : ((e = 0), (c = c + 1 + 1));
  }
  OVERWORLD.runCommand("kill @e[type=item]");
}
function placeBlocks() {
  system.runJob(placeBlocksGenerator());
}
function playerSpawn(e) {
  e.initialSpawn && (OVERWORLD.runCommand("function load"), placeBlocks());
}
world.afterEvents.playerBreakBlock.subscribe(placeBlocks),
  world.afterEvents.playerSpawn.subscribe(playerSpawn);

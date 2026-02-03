import {
  world,
  BlockTypes,
  system,
  BlockType,
  Vector3,
  PlayerSpawnAfterEvent,
  StartupEvent,
  Dimension,
  PlayerBreakBlockAfterEvent,
  BlockPermutation,
  Player,
  BlockVolume,
} from "@minecraft/server";
import { DebugCommand } from "./command/debug";
import { EntityUtils, Identifier, ModalForm, ModalFormHandler } from "@lpsmods/mc-utils";
import { makeId } from "./utils";
import { PROJECT_ID } from "./constants";
import { worldSettings } from "./config";
import { Vector3Utils } from "@minecraft/math";
import { Registry } from "@bedrock-oss/add-on-registry";

const START = { x: 1, y: 63, z: 1 };
const cachedBlocks: BlockPermutation[] = [];
let cachedMods: { [key: string]: string } = {};
var busy = false;

function getModIds(): { [key: string]: string } {
  if (Object.keys(cachedMods).length === 0) {
    const namespaces = [
      ...new Set(
        BlockTypes.getAll()
          .map((x) => Identifier.parse(x.id).namespace)
          .filter((namespace) => namespace !== "minecraft" && namespace !== PROJECT_ID),
      ),
    ];
    for (const name of namespaces) {
      const entry = Registry[name];
      cachedMods[name] = entry ? entry.name : name;
    }
  }
  return cachedMods;
}

function setModState(identifier: string, value?: boolean): void {
  const modded = JSON.parse(worldSettings.get("modded") ?? "{}");
  modded[identifier] = value ?? true;
  worldSettings.set("modded", JSON.stringify(modded));
}

function isModEnabled(identifier: string): boolean {
  const modded = JSON.parse(worldSettings.get("modded") ?? "{}");
  return identifier in modded ? modded[identifier] : true;
}

export function showConfig(player: Player): void {
  if (busy) {
    player.sendMessage(`chat.${PROJECT_ID}:${busy}`);
    return;
  }
  const form: ModalForm = {
    title: `menu.${PROJECT_ID}:config`,
    options: {
      vanilla: { label: `options.${PROJECT_ID}:vanilla`, type: "toggle", value: worldSettings.get("vanilla") },
    },
    onSubmit(event) {
      const res = event.formResult;
      worldSettings.set("vanilla", res.vanilla);
      for (const id of Object.keys(getModIds())) {
        setModState(id, res[id] as boolean);
      }
      refreshBlocks(player.dimension, true);
    },
    submitLabel: "structure_block.mode.save",
  };

  const modded = JSON.parse(worldSettings.get("modded"));

  // Add modded
  for (const [id, name] of Object.entries(getModIds())) {
    const label = { rawtext: [{ translate: "options.lpsm_dw:modded", with: { rawtext: [{ text: name }] } }] };
    form.options[id] = { label, type: "toggle", value: isModEnabled(id) };
  }

  const ui = new ModalFormHandler(form);
  ui.show(player);
}

function sortBlocks(left: BlockType, right: BlockType) {
  const c = left.id.split(":")[0];
  const l = right.id.split(":")[0];
  return "minecraft" === c && "minecraft" !== l
    ? -1
    : "minecraft" !== c && "minecraft" === l
      ? 1
      : left.id.localeCompare(right.id);
}

function getAllBlocks(): BlockPermutation[] {
  if (0 === cachedBlocks.length) {
    for (const e of BlockTypes.getAll().sort(sortBlocks)) {
      // TODO: Get all states.
      const def = BlockPermutation.resolve(e.id);
      cachedBlocks.push(def);
    }
  }
  return cachedBlocks.filter((x) => {
    const namespace = Identifier.parse(x.type.id).namespace;
    if (namespace === "minecraft") return worldSettings.get("vanilla");
    return isModEnabled(namespace);
  });
}

function placeBlock(dimension: Dimension, origin: Vector3, block: BlockPermutation): void {
  if (makeId("air") === block.type.id) return;
  for (let x = origin.x - 1; x < origin.x + 2; x++) {
    for (let y = origin.y - 1; y < origin.y + 2; y++) {
      for (let z = origin.z - 1; z < origin.z + 2; z++) {
        const pos = { x, y, z };
        dimension.setBlockType(pos, makeId("air"));
      }
    }
  }
  dimension.setBlockPermutation(origin, block);
}

function* clearBlocks(dimension: Dimension): Generator<void> {
  const vol = new BlockVolume(
    Vector3Utils.add(START, { x: -1, y: -2, z: -1 }),
    Vector3Utils.add(START, { x: 7 * 16, y: 2, z: 7 * 16 }),
  );

  const min = vol.getMin();
  const max = vol.getMax();
  for (let x = min.x; x < max.x; x++) {
    for (let y = min.y; y < max.y; y++) {
      for (let z = min.z; z < max.z; z++) {
        try {
          dimension.setBlockType({ x, y, z }, "air");
        } catch (err) {}
      }
    }
    yield;
  }
}

function* placeBlocksGenerator(dimension: Dimension, clear: boolean): Generator<void> {
  busy = true;
  if (clear) yield* clearBlocks(dimension);
  var x = START.x;
  var y = START.y;
  var z = START.z;
  for (const r of getAllBlocks()) {
    var pos = { x, y, z };
    try {
      placeBlock(dimension, pos, r);
    } catch (o) {
      x = x - 1 + 1;
    }
    if (x < 110) {
      x = x + 1 + 1;
    } else {
      x = 1;
      z = z + 1 + 1;
    }
    // x < 110 ? (x = x + 1 + 1) : ((x = 1), (z = z + 1 + 1));
  }
  busy = false;
  EntityUtils.removeAll({ type: "item" });
}

export function refreshBlocks(dimension: Dimension, clear: boolean = false): void {
  system.runJob(placeBlocksGenerator(dimension, clear));
}

// EVENTS

function playerBreakBlock(event: PlayerBreakBlockAfterEvent): void {
  if (busy) return;
  refreshBlocks(event.dimension);
}

function playerSpawn(event: PlayerSpawnAfterEvent): void {
  if (!event.initialSpawn) return;
  if (busy) return;
  const dim = event.player.dimension;
  dim.runCommand("function load");
  refreshBlocks(dim, true);
}

function startup(event: StartupEvent): void {
  DebugCommand.register(event.customCommandRegistry);
}

world.afterEvents.playerBreakBlock.subscribe(playerBreakBlock);
world.afterEvents.playerSpawn.subscribe(playerSpawn);
system.beforeEvents.startup.subscribe(startup);

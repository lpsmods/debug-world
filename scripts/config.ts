import { Settings } from "@lpsmods/mc-utils";
import { makeId } from "./utils";

export const worldSettings = new Settings(makeId("config"));
worldSettings.defineProperty("vanilla", { type: "boolean", value: true });
worldSettings.defineProperty("modded", { type: "string", value: '{}' });

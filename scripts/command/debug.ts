import {
  CustomCommand,
  CustomCommandOrigin,
  CustomCommandParamType,
  CustomCommandRegistry,
  CustomCommandResult,
  system,
} from "@minecraft/server";
import { makeId } from "../utils";
import { refreshBlocks, showConfig } from "../main";
import { CustomCommandUtils } from "@lpsmods/mc-utils";

export class DebugCommand {
  private static registered: boolean = false;

  static options: CustomCommand = {
    name: makeId("debug"),
    description: "Debug configuration.",
    permissionLevel: 1,
    mandatoryParameters: [{ name: makeId("debug_action"), type: CustomCommandParamType.Enum }],
  };

  static execute(ctx: CustomCommandOrigin, debugAction: string): CustomCommandResult | undefined {
    const dim = CustomCommandUtils.getDimension(ctx);
    switch (debugAction) {
      case "refresh":
        refreshBlocks(dim);
        return { status: 0, message: "Refreshed all blocks!" };
      case "config":
        const player = CustomCommandUtils.getPlayer(ctx);
        system.run(() => {
          showConfig(player);
        });
        return { status: 0, message: "Showing config!" };
    }
    return { status: 1, message: "Unknown action!" };
  }

  static register(registry: CustomCommandRegistry): void {
    if (this.registered) return;
    registry.registerEnum(makeId("debug_action"), ["refresh", "config"]);
    registry.registerCommand(this.options, this.execute);
    this.registered = true;
  }
}

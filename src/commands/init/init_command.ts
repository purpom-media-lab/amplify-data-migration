import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { printer } from "../../printer.js";
import { CommandMiddleware } from "../../command_middleware.js";

type InitCommandOptionsCamelCase = {
  branch: string;
  appId: string;
  profile?: string;
};

/**
 * Represents the InitCommand class.
 */
export class InitCommand
  implements CommandModule<object, InitCommandOptionsCamelCase>
{
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Creates top level entry point for generate command.
   */
  constructor() {
    this.command = "init";
    this.describe = "Initialize a new data migration table.";
  }

  /**
   * @inheritDoc
   */
  async handler(args: ArgumentsCamelCase<InitCommandOptionsCamelCase>) {
    console.log("init command handler", args);
  }

  /**
   * @inheritDoc
   */
  builder(yargs: Argv): Argv<InitCommandOptionsCamelCase> {
    return yargs
      .version(false)
      .option("branch", {
        describe: "Name of the git branch being initialized",
        demandOption: true,
        type: "string",
        array: false,
      })
      .option("appId", {
        describe: "The app id of the target Amplify app",
        demandOption: true,
        type: "string",
        array: false,
      })
      .option("profile", {
        describe: "An AWS profile name.",
        type: "string",
        array: false,
      })
      .middleware(new CommandMiddleware(printer).ensureAwsCredentialAndRegion);
  }
}

import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { printer } from "../../printer.js";
import { CommandMiddleware } from "../../command_middleware.js";
import { BackendIdentifierFactory } from "../../utils/backend_identifier_factory.js";
import { handler } from "./handler.js";

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
    const { branch, appId } = args;
    
    const backendIdentifier = await BackendIdentifierFactory.create({ branch, appId });
    await handler(backendIdentifier);
  }

  /**
   * @inheritDoc
   */
  builder(yargs: Argv): Argv<InitCommandOptionsCamelCase> {
    return yargs
      .version(false)
      .option("branch", {
        describe: "Name of the git branch being initialized",
        type: "string",
        array: false,
        demandOption: true,
      })
      .option("appId", {
        describe: "The app id of the target Amplify app (required for --branch)",
        type: "string",
        array: false,
        demandOption: true,
      })
      .option("profile", {
        describe: "An AWS profile name.",
        type: "string",
        array: false,
      })
      .middleware(new CommandMiddleware(printer).ensureAwsCredentialAndRegion);
  }
}

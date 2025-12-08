import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { printer } from "../../printer.js";
import { CommandMiddleware } from "../../command_middleware.js";
import { BackendIdentifierFactory } from "../../utils/backend_identifier_factory.js";
import { handler } from "./handler.js";

type DestroyCommandOptionsCamelCase = {
  branch: string;
  appId: string;
  profile?: string;
};

/**
 * Represents the DestoryCommand class.
 */
export class DestroyCommand
  implements CommandModule<object, DestroyCommandOptionsCamelCase>
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
    this.command = "destroy";
    this.describe = "Destroy a data migration table.";
  }

  /**
   * @inheritDoc
   */
  async handler(args: ArgumentsCamelCase<DestroyCommandOptionsCamelCase>) {
    const { branch, appId } = args;    
    const backendIdentifier = await BackendIdentifierFactory.create({ branch, appId });
    await handler(backendIdentifier);
  }

  /**
   * @inheritDoc
   */
  builder(yargs: Argv): Argv<DestroyCommandOptionsCamelCase> {
    return yargs
      .version(false)
      .option("branch", {
        describe: "Name of the git branch being destroyed",
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

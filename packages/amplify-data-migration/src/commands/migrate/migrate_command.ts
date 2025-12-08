import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { printer } from "../../printer.js";
import { CommandMiddleware } from "../../command_middleware.js";
import { BackendIdentifierFactory } from "../../utils/backend_identifier_factory.js";
import { handler } from "./handler.js";

type MigrateCommandOptionsCamelCase = {
  branch: string;
  appId: string;
  migrationsDir: string;
  profile?: string;
};

/**
 * Represents the MigrateCommand class.
 */
export class MigrateCommand
  implements CommandModule<object, MigrateCommandOptionsCamelCase>
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
    this.command = "migrate";
    this.describe = "Run migrations on specified app and branch.";
  }

  /**
   * @inheritDoc
   */
  async handler(args: ArgumentsCamelCase<MigrateCommandOptionsCamelCase>) {
    const { branch, appId, migrationsDir } = args;
    const backendIdentifier = await BackendIdentifierFactory.create({ branch, appId });
    await handler(backendIdentifier, migrationsDir);
  }

  /**
   * @inheritDoc
   */
  builder(yargs: Argv): Argv<MigrateCommandOptionsCamelCase> {
    return yargs
      .version(false)
      .option("branch", {
        describe: "Name of the git branch",
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
      .option("migrationsDir", {
        describe: "Path to migration files directory",
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

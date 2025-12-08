import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { BackendIdentifierFactory } from "../../../utils/backend_identifier_factory.js";
import { handler } from "../../migrate/handler.js";

type SandboxMigrateCommandOptionsCamelCase = {
  identifier?: string;
  migrationsDir: string;
};

/**
 * Represents the SandboxMigrateCommand class.
 */
export class SandboxMigrateCommand
  implements CommandModule<object, SandboxMigrateCommandOptionsCamelCase>
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
  async handler(args: ArgumentsCamelCase<SandboxMigrateCommandOptionsCamelCase>) {
    const { identifier, migrationsDir } = args;
    const backendIdentifier = await BackendIdentifierFactory.create({ sandbox: identifier });
    await handler(backendIdentifier, migrationsDir);
  }

  /**
   * @inheritDoc
   */
  builder(yargs: Argv): Argv<SandboxMigrateCommandOptionsCamelCase> {
    return yargs
      .version(false)
      .option("identifier", {
        describe:
          "Name of the sandbox environment (optional, defaults to current username)",
        type: "string",
        array: false,
      })
      .option("migrationsDir", {
        describe: "Path to migration files directory",
        demandOption: true,
        type: "string",
        array: false,
      });
  }
}

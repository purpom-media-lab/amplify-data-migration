import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { BackendIdentifierFactory } from "../../../utils/backend_identifier_factory.js";
import { handler } from "../../export/handler.js";

type SandboxExportCommandOptionsCamelCase = {
  identifier?: string;
  migrationsDir: string;
};

/**
 * Represents the ExportCommand class.
 */
export class SandboxExportCommand
  implements CommandModule<object, SandboxExportCommandOptionsCamelCase>
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
    this.command = "export";
    this.describe = "export a DynamoDB table.";
  }

  /**
   * @inheritDoc
   */
  async handler(args: ArgumentsCamelCase<SandboxExportCommandOptionsCamelCase>) {
    const { identifier, migrationsDir } = args;
    const backendIdentifier = await BackendIdentifierFactory.create({ sandbox: identifier });
    await handler(backendIdentifier, migrationsDir);
  }

  /**
   * @inheritDoc
   */
  builder(yargs: Argv): Argv<SandboxExportCommandOptionsCamelCase> {
    return yargs
      .version(false)
      .option("identifier", {
        describe: "Name of the sandbox environment (optional, defaults to current username)",
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

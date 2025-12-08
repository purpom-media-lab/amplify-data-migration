import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { BackendIdentifierFactory } from "../../../utils/backend_identifier_factory.js";
import { handler } from "../../init/handler.js";

type SandboxInitCommandOptionsCamelCase = {
  identifier?: string;
};

/**
 * Represents the InitCommand class.
 */
export class SandboxInitCommand
  implements CommandModule<object, SandboxInitCommandOptionsCamelCase>
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
  async handler(args: ArgumentsCamelCase<SandboxInitCommandOptionsCamelCase>) {
    const { identifier } = args;

    const backendIdentifier = await BackendIdentifierFactory.create({
      sandbox: identifier,
    });
    await handler(backendIdentifier);
  }

  /**
   * @inheritDoc
   */
  builder(yargs: Argv): Argv<SandboxInitCommandOptionsCamelCase> {
    return yargs.version(false).option("identifier", {
      describe:
        "Name of the sandbox environment (optional, defaults to current username)",
      type: "string",
      array: false,
    });
  }
}

import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { BackendIdentifierFactory } from "../../../utils/backend_identifier_factory.js";
import { handler } from "../../destroy/handler.js";

type SandboxDestroyCommandOptionsCamelCase = {
  identifier?: string;
};

/**
 * Represents the DestroyCommand class.
 */
export class SandboxDestroyCommand
  implements CommandModule<object, SandboxDestroyCommandOptionsCamelCase>
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
    this.describe = "Destroy a data migration table in a sandbox environment.";
  }

  /**
   * @inheritDoc
   */
  async handler(args: ArgumentsCamelCase<SandboxDestroyCommandOptionsCamelCase>) {
    const { identifier } = args;
    const backendIdentifier = await BackendIdentifierFactory.create({
      sandbox: identifier,
    });
    await handler(backendIdentifier);
  }

  /**
   * @inheritDoc
   */
  builder(yargs: Argv): Argv<SandboxDestroyCommandOptionsCamelCase> {
    return yargs
      .version(false)
      .option("identifier", {
        describe:
          "Name of the sandbox environment (optional, defaults to current username)",
        type: "string",
        array: false,
      });
  }
}

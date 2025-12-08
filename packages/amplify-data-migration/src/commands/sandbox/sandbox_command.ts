import { ArgumentsCamelCase, CommandBuilder, CommandModule } from "yargs";
import { createSandboxInitCommand } from "./sandbox-init/index.js";
import { createSandboxDestroyCommand } from "./sandbox-destroy/index.js";
import { createSandboxExportCommand } from "./sandbox-export/index.js";
import { createSandboxMigrateCommand } from "./sandbox-migrate/index.js";
import { CommandMiddleware } from "../../command_middleware.js";
import { printer } from "../../printer.js";

type SandboxCommandOptionsCamelCase = {
  identifier?: string;
  profile?: string;
};

/**
 * Represents the SandboxCommand class.
 */
export class SandboxCommand
  implements CommandModule<object, SandboxCommandOptionsCamelCase>
{
  command = "sandbox";

  describe = "Run migrations against a sandbox environment";

  builder: CommandBuilder<object, SandboxCommandOptionsCamelCase> = (yargs) => {
    return yargs
      .command(createSandboxInitCommand())
      .command(createSandboxDestroyCommand())
      .command(createSandboxExportCommand())
      .command(createSandboxMigrateCommand())
      .option("identifier", {
        describe:
          "Name of the sandbox environment (optional, defaults to current username)",
        type: "string",
        array: false,
      })
      .option("profile", {
        describe: "An AWS profile name.",
        type: "string",
        array: false,
      })
      .middleware(new CommandMiddleware(printer).ensureAwsCredentialAndRegion)
      .help();
  };

  async handler(
    args: ArgumentsCamelCase<SandboxCommandOptionsCamelCase>,
  ): Promise<void> {
    printer.log(
      "Please specify a subcommand. Use --help to see available subcommands.",
    );
  };
}

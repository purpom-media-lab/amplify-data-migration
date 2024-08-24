import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { printer } from "../../printer.js";
import { CommandMiddleware } from "../../command_middleware.js";
import { MigrationTableClient } from "../../migration/migration_table_client.js";

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
    const migrationClient = new MigrationTableClient(appId, branch);
    const tableName = await migrationClient.destroyMigrationTable();
    printer.log(`Destroyed migration table: ${tableName} for branch ${branch}`);
  }

  /**
   * @inheritDoc
   */
  builder(yargs: Argv): Argv<DestroyCommandOptionsCamelCase> {
    return yargs
      .version(false)
      .option("branch", {
        describe: "Name of the git branch being destoryed",
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

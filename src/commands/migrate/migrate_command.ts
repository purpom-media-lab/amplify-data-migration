import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { printer } from "../../printer.js";
import { CommandMiddleware } from "../../command_middleware.js";
import { MigrationTableClient } from "../../migration/migration_table_client.js";
import { MigrationRunner } from "../../migration/migration_runner.js";
import { DefaultDynamoDBTableProvider } from "../../migration/default_dynamodb_table_provider.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

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
    const dynamoDBClient = new DynamoDBClient();
    const migrationTableClient = new MigrationTableClient(appId, branch);
    const dynamoDBTableProvider = new DefaultDynamoDBTableProvider({
      appId,
      branch,
    });
    const migrationRunner = new MigrationRunner({
      migrationsDir,
      dynamoDBClient,
      migrationTableClient,
      dynamoDBTableProvider,
    });
    await migrationRunner.run();
  }

  /**
   * @inheritDoc
   */
  builder(yargs: Argv): Argv<MigrateCommandOptionsCamelCase> {
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

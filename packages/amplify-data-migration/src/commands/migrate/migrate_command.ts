import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { printer } from "../../printer.js";
import { CommandMiddleware } from "../../command_middleware.js";
import { MigrationTableClient } from "../../migration/migration_table_client.js";
import { MigrationRunner } from "../../migration/migration_runner.js";
import { DefaultDynamoDBTableProvider } from "../../migration/default_dynamodb_table_provider.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { S3ExportClient } from "../../export/s3_export_client.js";
import { BackendIdentifierFactory } from "../../utils/backend_identifier_factory.js";
import { userInfo } from "node:os";

type MigrateCommandOptionsCamelCase = {
  branch?: string;
  sandbox?: string;
  appId?: string;
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
    const { branch, sandbox, appId, migrationsDir } = args;
    
    const backendIdentifier = await BackendIdentifierFactory.create({ branch, sandbox, appId });
    
    const dynamoDBClient = new DynamoDBClient();
    const s3Client = new S3Client();
    const migrationTableClient = new MigrationTableClient(backendIdentifier);
    const dynamoDBTableProvider = new DefaultDynamoDBTableProvider({
      backendIdentifier,
    });
    const s3ExportClient = new S3ExportClient({
      backendIdentifier,
      s3Client,
    });
    const migrationRunner = new MigrationRunner({
      migrationsDir,
      dynamoDBClient,
      s3Bucket: s3ExportClient.generateBucketName(),
      s3Client,
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
        describe: "Name of the git branch",
        type: "string",
        array: false,
      })
      .option("sandbox", {
        describe: "Name of the sandbox environment (optional, defaults to current username)",
        type: "string",
        array: false,
        default: userInfo().username,
      })
      .option("appId", {
        describe: "The app id of the target Amplify app (required for --branch)",
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

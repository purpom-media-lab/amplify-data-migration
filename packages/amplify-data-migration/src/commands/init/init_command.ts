import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { printer } from "../../printer.js";
import { CommandMiddleware } from "../../command_middleware.js";
import { MigrationTableClient } from "../../migration/migration_table_client.js";
import { S3Client } from "@aws-sdk/client-s3";
import { S3ExportClient } from "../../export/s3_export_client.js";
import { BackendIdentifierFactory } from "../../utils/backend_identifier_factory.js";
import { userInfo } from "node:os";

type InitCommandOptionsCamelCase = {
  branch?: string;
  sandbox?: string;
  appId?: string;
  profile?: string;
};

/**
 * Represents the InitCommand class.
 */
export class InitCommand
  implements CommandModule<object, InitCommandOptionsCamelCase>
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
  async handler(args: ArgumentsCamelCase<InitCommandOptionsCamelCase>) {
    const { branch, sandbox, appId } = args;
    
    const backendIdentifier = await BackendIdentifierFactory.create({ branch, sandbox, appId });
    
    const s3Client = new S3Client();
    const migrationTableClient = new MigrationTableClient(backendIdentifier);
    const s3ExportClient = new S3ExportClient({
      backendIdentifier,
      s3Client,
    });
    const tableName = await migrationTableClient.createMigrationTable();
    printer.log(
      `Initialize migration table: ${tableName} for ${backendIdentifier.type} ${backendIdentifier.name}`
    );
    const bucketName = await s3ExportClient.createBucket();
    printer.log(`Initialize S3 bucket: ${bucketName} for ${backendIdentifier.type} ${backendIdentifier.name}`);
  }

  /**
   * @inheritDoc
   */
  builder(yargs: Argv): Argv<InitCommandOptionsCamelCase> {
    return yargs
      .version(false)
      .option("branch", {
        describe: "Name of the git branch being initialized",
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
      .option("profile", {
        describe: "An AWS profile name.",
        type: "string",
        array: false,
      })
      .middleware(new CommandMiddleware(printer).ensureAwsCredentialAndRegion);
  }
}

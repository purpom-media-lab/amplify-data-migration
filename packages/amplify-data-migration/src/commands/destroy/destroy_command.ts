import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { printer } from "../../printer.js";
import { CommandMiddleware } from "../../command_middleware.js";
import { MigrationTableClient } from "../../migration/migration_table_client.js";
import { S3ExportClient } from "../../export/s3_export_client.js";
import { S3Client } from "@aws-sdk/client-s3";
import { BackendIdentifierFactory } from "../../utils/backend_identifier_factory.js";
import { userInfo } from "node:os";
import { ResourceNotFoundException } from "@aws-sdk/client-dynamodb";

type DestroyCommandOptionsCamelCase = {
  branch?: string;
  sandbox?: string;
  appId?: string;
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
    const { branch, sandbox, appId } = args;    
    const backendIdentifier = await BackendIdentifierFactory.create({ branch, sandbox, appId });
    
    const migrationTableClient = new MigrationTableClient(backendIdentifier);
    const s3Client = new S3Client();
    const s3ExportClient = new S3ExportClient({
      backendIdentifier,
      s3Client,
    });
    try {
      const tableName = await migrationTableClient.destroyMigrationTable();
      printer.log(`Destroyed migration table: ${tableName} for ${backendIdentifier.type} ${backendIdentifier.name}`);
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        printer.log(`Migration table does not exist for ${backendIdentifier.type} ${backendIdentifier.name}`);
      } else {
        throw error;
      }
    }
    const bucketName = await s3ExportClient.destroyBucket();
    printer.log(`Destroyed S3 bucket: ${bucketName} for ${backendIdentifier.type} ${backendIdentifier.name}`);
  }

  /**
   * @inheritDoc
   */
  builder(yargs: Argv): Argv<DestroyCommandOptionsCamelCase> {
    return yargs
      .version(false)
      .option("branch", {
        describe: "Name of the git branch being destroyed",
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

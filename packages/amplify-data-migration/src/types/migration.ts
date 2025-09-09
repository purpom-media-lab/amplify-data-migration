import type { ExportContext, MigrationContext } from "./context.js";
import type { DynamoDBExportKey } from "./dynamodb_export_key.js";

/**
 * Migrations should implement this interface
 */
export interface Migration {
  /**
   * This migration name, defaults to class name.
   */
  readonly name: string;

  /**
   * This migration timestamp, defaults to current time.
   */
  readonly timestamp: number;

  /**
   * Create export data to used to migration in the run method.
   * If the key of the dynamnodb table changes, the dynamodb table will be replace, so export data with this method and use it with the run method to import data into a new table.
   * This method is executed before the dynamodb is changed (before the deployment).
   *
   * @param context - The context object that contains the model clients
   * @returns An object where the keys are the model names and the values ​​are the S3 keys of the exported data
   */
  export?(context: ExportContext): Promise<Record<string, DynamoDBExportKey>>;

  /**
   * Run the data migration.
   *
   * @param context - The context object that contains the model clients
   */
  run(context: MigrationContext): Promise<void>;
}

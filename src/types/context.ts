import { AmplifyDynamoDBTable } from "../migration/types/dynamodb_table_provider.js";
import { DynamoDBExportKey } from "./dynamodb_export_key.js";
import { ModelClient } from "./model_client.js";

/**
 * Context of migration processing.
 */
export interface MigrationContext {
  /**
   * A list of tables to be migrated.
   * The key is the name of the model.
   * The value is the table information.
   */
  tables: Record<string, AmplifyDynamoDBTable>;
  /**
   * A list of exported data.
   * The key is the name of the model.
   * The value is the key to the exported data.
   */
  exported: Record<string, DynamoDBExportKey>;
  /**
   * The client to be used for data migration.
   */
  modelClient: ModelClient;
}

/**
 * Context of export processing.
 */
export interface ExportContext {
  /**
   * A list of tables to be migrated.
   * The key is the name of the model.
   * The value is the table information.
   */
  tables: Record<string, AmplifyDynamoDBTable>;
  /**
   * The client to be used for data migration.
   */
  modelClient: ModelClient;
}

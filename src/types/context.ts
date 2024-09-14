import { AmplifyDynamoDBTable } from "../migration/types/dynamodb_table_provider.js";
import { DynamoDBExportKey } from "./dynamodb_export_key.js";
import { ModelClient } from "./model_client.js";

export interface MigrationContext {
  tables: Record<string, AmplifyDynamoDBTable>; // key: modelName, value: dynamoDBTableName
  exported: Record<string, DynamoDBExportKey>; // key: modelName, value: exported S3 key
  modelClient: ModelClient;
}

export interface ExportContext {
  tables: Record<string, AmplifyDynamoDBTable>; // key: modelName, value: dynamoDBTableArn
  modelClient: ModelClient;
}

import { DynamoDBExportKey } from "../export/types/dynamodb_table_exporter.js";
import { AmplifyDynamoDBTable } from "../migration/dynamodb_table_provider.js";
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

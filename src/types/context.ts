import { ModelClient } from "./model_client.js";

export interface MigrationContext {
  tables: Record<string, string>; // key: modelName, value: dynamoDBTableName
  exported: Record<string, string>; // key: modelName, value: exported S3 key
  modelClient: ModelClient;
}

export interface ExportContext {
  tables: Record<string, string>; // key: modelName, value: dynamoDBTableArn
}
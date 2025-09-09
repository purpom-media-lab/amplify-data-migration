import { DynamoDBExportKey } from "../../types/dynamodb_export_key.js";

export interface DynamoDBTableExporter {
  runExport(): Promise<DynamoDBExportKey>;
}

export interface DynamoDBTableExporterFactory {
  create(modelName: string): Promise<DynamoDBTableExporter>;
}

export interface DynamoDBTableExportFactory {
  getExport<TModel extends object>(
    key: DynamoDBExportKey
  ): Promise<DynamoDBExport<TModel>>;
}

export interface DynamoDBExport<TModel> {
  items(): AsyncGenerator<TModel, void, void>;
}

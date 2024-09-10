import { AttributeValue, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  paginateScan,
  BatchWriteCommand,
  BatchWriteCommandInput,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { ModelClient, ModelTransformer } from "../types/model_client.js";
import { AmplifyDynamoDBTable } from "./types/dynamodb_table_provider.js";
import {
  DynamoDBExportKey,
  DynamoDBTableExporterFactory,
  DynamoDBTableExportFactory,
} from "../export/types/dynamodb_table_exporter.js";

export class DynamoDBModelClient implements ModelClient {
  private readonly tables: Record<string, AmplifyDynamoDBTable> = {};
  private readonly exported: Record<string, DynamoDBExportKey> = {};
  private readonly dynamoDBClient: DynamoDBClient;
  private readonly dynamoDBDocumentClient: DynamoDBDocumentClient;
  private readonly dynamoDBTableExporterFactory: DynamoDBTableExporterFactory;
  private readonly dynamoDBTableExportFactory: DynamoDBTableExportFactory;

  constructor({
    tables,
    exported,
    dynamoDBClient,
    dynamoDBTableExporterFactory,
    dynamoDBTableExportFactory,
  }: {
    tables?: Record<string, AmplifyDynamoDBTable>;
    exported?: Record<string, DynamoDBExportKey>;
    dynamoDBClient?: DynamoDBClient;
    dynamoDBTableExporterFactory: DynamoDBTableExporterFactory;
    dynamoDBTableExportFactory: DynamoDBTableExportFactory;
  }) {
    this.tables = tables ?? {};
    this.exported = exported ?? {};
    this.dynamoDBClient = dynamoDBClient ?? new DynamoDBClient();
    this.dynamoDBDocumentClient = DynamoDBDocumentClient.from(
      this.dynamoDBClient
    );
    this.dynamoDBTableExporterFactory = dynamoDBTableExporterFactory;
    this.dynamoDBTableExportFactory = dynamoDBTableExportFactory;
  }

  async updateModel(
    modelName: string,
    transformer: ModelTransformer<any, any>,
    options?: {
      filter?: {
        expression: string;
        attributeValues?: Record<string, AttributeValue>;
        attributeNames?: Record<string, string>;
      };
    }
  ): Promise<void> {
    const table = this.tables[modelName];
    if (!table) {
      throw new Error(`Table not found for model: ${modelName}`);
    }
    const tableName = table.tableName;
    const paginator = paginateScan(
      {
        client: this.dynamoDBDocumentClient,
        pageSize: 25,
      },
      {
        TableName: tableName,
      }
    );
    for await (const page of paginator) {
      if (!page.Items) {
        continue;
      }
      const items = await Promise.all(
        page.Items.map((item) => transformer(item))
      );
      const input: BatchWriteCommandInput = this.toBatchWriteItemInput(
        tableName,
        items
      );
      await this.dynamoDBDocumentClient.send(new BatchWriteCommand(input));
    }
  }

  async exportModel(modelName: string): Promise<DynamoDBExportKey> {
    const exporter = await this.dynamoDBTableExporterFactory.create(modelName);
    return exporter.runExport();
  }

  private toBatchWriteItemInput(
    tableName: string,
    items: Record<string, any>[]
  ): BatchWriteCommandInput {
    return {
      RequestItems: {
        [tableName]: items.map((item) => ({
          PutRequest: { Item: item },
        })),
      },
    };
  }

  async runImport<TModel extends object>(
    modelName: string,
    transformer: ModelTransformer<any, any>
  ): Promise<void> {
    const amplifyDaynamoDBTable = this.tables[modelName];
    if (!amplifyDaynamoDBTable) {
      throw new Error(`Table not found for model: ${modelName}`);
    }
    const exportedKey = this.exported[modelName];
    const dynamoDBExport =
      await this.dynamoDBTableExportFactory.getExport<TModel>(exportedKey);

    const batchWriteItems = async (newModels: any[]) => {
      const input = this.toBatchWriteItemInput(
        amplifyDaynamoDBTable.tableName,
        newModels
      );
      await this.dynamoDBDocumentClient.send(new BatchWriteCommand(input));
    };
    const newModels: any[] = [];
    for await (const item of dynamoDBExport.items()) {
      newModels.push(await transformer(item));
      if (newModels.length === 25) {
        await batchWriteItems(newModels);
        newModels.length = 0;
      }
    }
    if (newModels.length > 0) {
      await batchWriteItems(newModels);
    }
  }
}

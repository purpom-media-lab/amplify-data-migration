import { AttributeValue, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  paginateScan,
  BatchWriteCommand,
  BatchWriteCommandInput,
  DynamoDBDocumentClient,
  NativeAttributeValue,
} from "@aws-sdk/lib-dynamodb";
import type {
  ModelClient,
  ModelGenerator,
  ModelTransformer,
} from "../types/model_client.js";
import type { AmplifyDynamoDBTable } from "./types/dynamodb_table_provider.js";
import type {
  DynamoDBTableExporterFactory,
  DynamoDBTableExportFactory,
} from "../export/types/dynamodb_table_exporter.js";
import type { DynamoDBExportKey } from "../types/dynamodb_export_key.js";

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

  putModel<Model>(
    modelName: string,
    generator: ModelGenerator<Model>
  ): Promise<void>;
  putModel<Model>(modelName: string, ...models: Model[]): Promise<void>;

  async putModel<Model>(
    modelName: string,
    generator?: ModelGenerator<Model> | Model[]
  ): Promise<void> {
    if (this.isModelGenerator(generator)) {
      const table = this.tables[modelName];
      if (!table) {
        throw new Error(`Table not found for model: ${modelName}`);
      }
      const tableName = table.tableName;
      const newModels: any[] = [];
      for await (const model of generator()) {
        newModels.push(model);
        if (newModels.length === 25) {
          const input = this.toBatchWriteItemInput(tableName, newModels);
          await this.dynamoDBDocumentClient.send(new BatchWriteCommand(input));
          newModels.length = 0;
        }
      }
      if (newModels.length > 0) {
        const input = this.toBatchWriteItemInput(tableName, newModels);
        await this.dynamoDBDocumentClient.send(new BatchWriteCommand(input));
      }
    } else if (Array.isArray(generator)) {
      const table = this.tables[modelName];
      if (!table) {
        throw new Error(`Table not found for model: ${modelName}`);
      }
      const tableName = table.tableName;
      await Promise.all(
        this.splitArray(generator, 25).map(async (items) => {
          const input: BatchWriteCommandInput = this.toBatchWriteItemInput(
            tableName,
            items as Record<string, any>[]
          );
          await this.dynamoDBDocumentClient.send(new BatchWriteCommand(input));
        })
      );
    } else {
      throw new Error(
        `${typeof generator} is not supported arguemnt type. Supported types are AsyncGenerator or Array.`
      );
    }
  }

  private splitArray<T>(array: T[], size: number): T[][] {
    return new Array(Math.ceil(array.length / size))
      .fill(null)
      .map((_, i) => array.slice(size * i, size * (i + 1)));
  }

  private isModelGenerator<T>(obj: unknown): obj is ModelGenerator<T> {
    return (
      typeof obj === "function" &&
      obj.constructor.name === "AsyncGeneratorFunction"
    );
  }

  async updateModel(
    modelName: string,
    transformer: ModelTransformer<any, any>,
    options?: {
      filter?: {
        expression: string;
        attributeValues?: Record<string, NativeAttributeValue>;
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
        ...(options?.filter ? {
          FilterExpression: options.filter.expression,
          ExpressionAttributeValues: options.filter.attributeValues,
          ExpressionAttributeNames: options.filter.attributeNames,
        } : {})
      }
    );
    for await (const page of paginator) {
      if (!page.Items || page.Items.length === 0) {
        continue;
      }
      const items = await Promise.all(
        page.Items.map((item) => transformer(item))
      );
      const filteredItems = items.filter((item) => item !== null);
      if (filteredItems.length === 0) {
        continue;
      }
      const input: BatchWriteCommandInput = this.toBatchWriteItemInput(
        tableName,
        filteredItems
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
      const newItem = await transformer(item);
      if (!newItem) {
        continue;
      }
      newModels.push(newItem);
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

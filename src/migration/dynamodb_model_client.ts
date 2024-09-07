import {
  AttributeValue,
  DynamoDBClient,
  ExportTableToPointInTimeCommand,
} from "@aws-sdk/client-dynamodb";
import {
  paginateScan,
  BatchWriteCommand,
  BatchWriteCommandInput,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { ModelClient, ModelTransformer } from "../types/model_client.js";

export class DynamoDBModelClient implements ModelClient {
  private readonly tables: Record<string, string> = {};
  private readonly exported: Record<string, string> = {};
  private readonly dynamoDBClient: DynamoDBClient;
  private readonly dynamoDBDocumentClient: DynamoDBDocumentClient;

  constructor({
    tables,
    exported,
    dynamoDBClient,
  }: {
    tables?: Record<string, string>;
    exported?: Record<string, string>;
    dynamoDBClient?: DynamoDBClient;
  } = {}) {
    this.tables = tables ?? {};
    this.exported = exported ?? {};
    this.dynamoDBClient = dynamoDBClient ?? new DynamoDBClient();
    this.dynamoDBDocumentClient = DynamoDBDocumentClient.from(
      this.dynamoDBClient
    );
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
    const tableName = this.tables[modelName];
    if (!tableName) {
      throw new Error(`Table not found for model: ${modelName}`);
    }

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

  runImport(modelName: string, transformer: ModelTransformer): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

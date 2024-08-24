import { AttributeValue, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ModelClient, ModelTransformer } from "../types/model_client.js";

export class DynamoDBModelClient implements ModelClient {
  private readonly tables: Record<string, string> = {};
  private readonly exported: Record<string, string> = {};
  private readonly dynamoDBClient: DynamoDBClient;

  constructor({
    tables,
    exported,
  }: {
    tables?: Record<string, string>;
    exported?: Record<string, string>;
  } = {}) {
    this.tables = tables ?? {};
    this.exported = exported ?? {};
    this.dynamoDBClient = new DynamoDBClient();
  }

  updateModel(
    modelName: string,
    transformer: ModelTransformer,
    options?: {
      filter?: {
        expression: string;
        attributeValues?: Record<string, AttributeValue>;
        attributeNames?: Record<string, string>;
      };
    }
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  runImport(modelName: string, transformer: ModelTransformer): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

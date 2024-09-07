import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import type { Migration } from "../types/migration.js";

type MigrationRecord = {
  action: "run" | "export";
  timestamp: number;
  name: string;
  executedAt: string;
};

export class MigrationTableClient {
  private appId: string;
  private branch: string;
  private dynamoDBClient: DynamoDBClient;

  constructor(appId: string, branch: string, dynamoDBClient?: DynamoDBClient) {
    this.dynamoDBClient = dynamoDBClient ?? new DynamoDBClient();
    this.appId = appId;
    this.branch = branch;
  }

  /**
   * Generates a migration table name based on the appId and branch.
   * @returns The generated migration table name
   * @internal
   */
  generateTableName() {
    return `amplify-data-migration-${this.appId}-${this.branch}`;
  }

  async createMigrationTable() {
    const tableName = this.generateTableName();
    await this.dynamoDBClient.send(
      new CreateTableCommand({
        TableName: tableName,
        KeySchema: [
          {
            AttributeName: "action",
            KeyType: "HASH",
          },
          {
            AttributeName: "timestamp",
            KeyType: "RANGE",
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: "action",
            AttributeType: "S",
          },
          {
            AttributeName: "timestamp",
            AttributeType: "N",
          },
        ],
        BillingMode: "PAY_PER_REQUEST",
      })
    );
    return tableName;
  }

  async destroyMigrationTable() {
    const tableName = this.generateTableName();
    await this.dynamoDBClient.send(
      new DeleteTableCommand({
        TableName: tableName,
      })
    );
    return tableName;
  }

  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const tableName = this.generateTableName();
    const output = await this.dynamoDBClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "#action = :action",
        ExpressionAttributeNames: {
          "#action": "action",
        },
        ExpressionAttributeValues: {
          ":action": { S: "run" },
        },
      })
    );
    return (
      output.Items?.map((item) => ({
        action: item.action.S as "run",
        timestamp: parseInt(item.timestamp.N as string, 10),
        name: item.name.S as string,
        executedAt: item.executedAt.S as string,
      })) ?? []
    );
  }

  async getLastMigrationTimestamp(): Promise<number | undefined> {
    const tableName = this.generateTableName();
    const output = await this.dynamoDBClient.send(
      new QueryCommand({
        TableName: tableName,
        Limit: 1,
        ScanIndexForward: false,
        ConsistentRead: true,
        KeyConditionExpression: "#action = :action",
        ExpressionAttributeNames: {
          "#action": "action",
        },
        ExpressionAttributeValues: {
          ":action": { S: "run" },
        },
      })
    );
    if (output.Count === 0) {
      return undefined;
    }
    const value = output.Items?.[0].timestamp.N;
    return value ? parseInt(value, 10) : undefined;
  }

  async saveExecutedMigration(
    migration: Pick<Migration, "name" | "timestamp">
  ) {
    const tableName = this.generateTableName();
    const output = await this.dynamoDBClient.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          action: { S: "run" },
          timestamp: { N: migration.timestamp.toString() },
          name: { S: migration.name },
          executedAt: { S: new Date().toISOString() },
        },
      })
    );
  }

  async getExported(migration: Migration) {
    const tableName = this.generateTableName();
    const output = await this.dynamoDBClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "#action = :action AND #timestamp = :timestamp",
        ExpressionAttributeNames: {
          "#action": "action",
          "#timestamp": "timestamp",
        },
        ExpressionAttributeValues: {
          ":action": { S: "export" },
          ":timestamp": { N: migration.timestamp.toString(10) },
        },
      })
    );
    if (output.Count === 0 || !output.Items) {
      return undefined;
    }
    const value = output.Items[0].exported.S;
    return value ? (JSON.parse(value) as Record<string, string>) : undefined;
  }

  async saveExported(
    migration: Pick<Migration, "name" | "timestamp"> & {
      exported: Record<string, string>;
    }
  ) {
    const tableName = this.generateTableName();
    const output = await this.dynamoDBClient.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          action: { S: "export" },
          name: { S: migration.name },
          timestamp: { N: Date.now().toString() },
          exported: { S: JSON.stringify(migration.exported) },
          executedAt: { S: new Date().toISOString() },
        },
      })
    );
  }
}

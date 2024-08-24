import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import type { Migration } from "../types/migration.js";

export class MigrationTableClient {
  private appId: string;
  private branch: string;
  private dynamoDBClient: DynamoDBClient;

  constructor(appId: string, branch: string, dynamoDBClient?: DynamoDBClient) {
    this.dynamoDBClient = dynamoDBClient ?? new DynamoDBClient();
    this.appId = appId;
    this.branch = branch;
  }

  private generateTableName({
    appId,
    branch,
  }: {
    appId: string;
    branch: string;
  }) {
    return `amplify-data-migration-${appId}-${branch}`;
  }

  async createMigrationTable() {
    const tableName = this.generateTableName({
      appId: this.appId,
      branch: this.branch,
    });
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
    const tableName = this.generateTableName({
      appId: this.appId,
      branch: this.branch,
    });
    await this.dynamoDBClient.send(
      new DeleteTableCommand({
        TableName: tableName,
      })
    );
    return tableName;
  }

  async getLastMigrationTimestamp(): Promise<number | undefined> {
    const tableName = this.generateTableName({
      appId: this.appId,
      branch: this.branch,
    });
    const output = await this.dynamoDBClient.send(
      new QueryCommand({
        TableName: tableName,
        Limit: 1,
        ScanIndexForward: false,
        ConsistentRead: true,
        KeyConditionExpression: "action = :action",
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

  async saveExecutedMigration(migration: Migration) {
    const tableName = this.generateTableName({
      appId: this.appId,
      branch: this.branch,
    });
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
}

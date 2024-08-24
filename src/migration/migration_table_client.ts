import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";

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
}

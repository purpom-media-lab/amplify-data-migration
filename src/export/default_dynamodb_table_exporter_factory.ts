import {
  DescribeContinuousBackupsCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { PITRDynamoDBTableExporter } from "./pitr_dynamodb_table_exporter.js";
import {
  DynamoDBTableExporter,
  DynamoDBTableExporterFactory,
} from "./types/dynamodb_table_exporter.js";
import { AmplifyDynamoDBTable } from "../migration/dynamodb_table_provider.js";

export class DefaultDynamoDBTableExporterFactory
  implements DynamoDBTableExporterFactory
{
  private readonly tables: Record<string, AmplifyDynamoDBTable> = {};
  private readonly dynamoDBClient: DynamoDBClient;
  private readonly s3Bucket: string;

  constructor({
    tables,
    dynamoDBClient,
    s3Bucket,
  }: {
    tables: Record<string, AmplifyDynamoDBTable>;
    dynamoDBClient: DynamoDBClient;
    s3Bucket: string;
  }) {
    this.tables = tables;
    this.dynamoDBClient = dynamoDBClient;
    this.s3Bucket = s3Bucket;
  }

  async create(modelName: string): Promise<DynamoDBTableExporter> {
    const table = this.tables[modelName];
    if (!table) {
      throw new Error(`DynamoDB table for model "${modelName}" not found`);
    }
    const describeBackupOutput = await this.dynamoDBClient.send(
      new DescribeContinuousBackupsCommand({ TableName: table.tableName })
    );
    if (
      describeBackupOutput.ContinuousBackupsDescription
        ?.PointInTimeRecoveryDescription?.PointInTimeRecoveryStatus ===
      "ENABLED"
    ) {
      // use PITR
      return new PITRDynamoDBTableExporter(
        this.dynamoDBClient,
        this.s3Bucket,
        table
      );
    } else {
      // TODO: use on-demand backup
    }
    throw new Error("Invalid backup configuration");
  }
}

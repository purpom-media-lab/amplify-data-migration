import {
  DescribeExportCommand,
  DynamoDBClient,
  ExportTableToPointInTimeCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBExportKey,
  DynamoDBTableExporter,
} from "./types/dynamodb_table_exporter.js";
import { AmplifyDynamoDBTable } from "../migration/types/dynamodb_table_provider.js";

/**
 * Exporter DynamoDB table to S3 using Point-in-Time Recovery
 */
export class PITRDynamoDBTableExporter implements DynamoDBTableExporter {
  constructor(
    private readonly dynamoDBClient: DynamoDBClient,
    private readonly s3Bucket: string,
    private readonly table: AmplifyDynamoDBTable,
    private readonly interval: number = 5000
  ) {}

  async runExport(): Promise<DynamoDBExportKey> {
    const dynamoDBTable = this.table;
    const exportOutput = await this.dynamoDBClient.send(
      new ExportTableToPointInTimeCommand({
        TableArn: dynamoDBTable.tableArn,
        S3Bucket: this.s3Bucket,
      })
    );
    let exportDescription = exportOutput.ExportDescription;
    while (exportDescription?.ExportStatus === "IN_PROGRESS") {
      await new Promise((resolve) => setTimeout(resolve, this.interval));
      const describeExportOutput = await this.dynamoDBClient.send(
        new DescribeExportCommand({
          ExportArn: exportOutput.ExportDescription?.ExportArn,
        })
      );
      exportDescription = describeExportOutput.ExportDescription;
    }
    if (exportDescription?.ExportStatus === "FAILED") {
      throw new Error(
        `Export failed for table "${dynamoDBTable.tableName}": ${exportDescription.FailureCode} ${exportDescription.FailureMessage}`
      );
    }
    return {
      strategy: "PITR",
      key: exportDescription!.ExportManifest!,
    };
  }
}

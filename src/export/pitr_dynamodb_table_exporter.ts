import {
  DescribeExportCommand,
  DynamoDBClient,
  ExportTableToPointInTimeCommand,
} from "@aws-sdk/client-dynamodb";
import type { DynamoDBTableExporter } from "./types/dynamodb_table_exporter.js";
import type { AmplifyDynamoDBTable } from "../migration/types/dynamodb_table_provider.js";
import type { DynamoDBExportKey } from "../types/dynamodb_export_key.js";
import { printer } from "../printer.js";

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
    printer.log(`Exporting table "${dynamoDBTable.tableName}" to S3`);
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
    printer.log(
      `Exported table "${dynamoDBTable.tableName}" to S3 successfully. ${exportDescription?.ExportArn}`
    );
    return {
      strategy: "PITR",
      key: exportDescription!.ExportManifest!,
    };
  }
}

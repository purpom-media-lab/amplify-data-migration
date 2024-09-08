import { S3Client } from "@aws-sdk/client-s3";
import {
  DynamoDBExport,
  DynamoDBExportKey,
  DynamoDBTableExportFactory,
} from "./types/dynamodb_table_exporter.js";
import { PITRDynamoDBExport } from "./pitr_dynamodb_table_export.js";

export class DefaultDynamoDBTableExportFactory
  implements DynamoDBTableExportFactory
{
  constructor(
    private readonly s3Client: S3Client,
    private readonly s3Bucket: string
  ) {}
  async getExport<TModel extends object>(
    key: DynamoDBExportKey
  ): Promise<DynamoDBExport<TModel>> {
    if (key.strategy === "PITR") {
      return new PITRDynamoDBExport<TModel>(
        this.s3Client,
        this.s3Bucket,
        key.key
      );
    } else {
      // TODO: Implement ON_DEMAND export
      throw new Error(`Unsupported export strategy: ${key.strategy}`);
    }
  }
}

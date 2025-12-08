import { BackendIdentifier } from "@aws-amplify/plugin-types";
import { S3Client } from "@aws-sdk/client-s3";
import { MigrationTableClient } from "../../migration/migration_table_client.js";
import { S3ExportClient } from "../../export/s3_export_client.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DefaultDynamoDBTableProvider } from "../../migration/default_dynamodb_table_provider.js";
import { MigrationRunner } from "../../migration/migration_runner.js";

export async function handler(
  backendIdentifier: BackendIdentifier,
  migrationsDir: string
) {
  const dynamoDBClient = new DynamoDBClient();
  const s3Client = new S3Client();
  const migrationTableClient = new MigrationTableClient(backendIdentifier);
  const dynamoDBTableProvider = new DefaultDynamoDBTableProvider({
    backendIdentifier,
  });
  const s3ExportClient = new S3ExportClient({
    backendIdentifier,
    s3Client,
  });
  const migrationRunner = new MigrationRunner({
    migrationsDir,
    dynamoDBClient,
    s3Bucket: s3ExportClient.generateBucketName(),
    s3Client,
    migrationTableClient,
    dynamoDBTableProvider,
  });
  await migrationRunner.export();
}

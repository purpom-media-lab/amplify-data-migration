import { BackendIdentifier } from "@aws-amplify/plugin-types";
import { S3Client } from "@aws-sdk/client-s3";
import { MigrationTableClient } from "../../migration/migration_table_client.js";
import { S3ExportClient } from "../../export/s3_export_client.js";
import { printer } from "../../printer.js";

export async function handler(backendIdentifier: BackendIdentifier) {
  const s3Client = new S3Client();
  const migrationTableClient = new MigrationTableClient(backendIdentifier);
  const s3ExportClient = new S3ExportClient({
    backendIdentifier,
    s3Client,
  });
  const tableName = await migrationTableClient.createMigrationTable();
  printer.log(
    `Initialize migration table: ${tableName} for ${backendIdentifier.type} ${backendIdentifier.name}`
  );
  const bucketName = await s3ExportClient.createBucket();
  printer.log(
    `Initialize S3 bucket: ${bucketName} for ${backendIdentifier.type} ${backendIdentifier.name}`
  );
}

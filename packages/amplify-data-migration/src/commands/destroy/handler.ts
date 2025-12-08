import { BackendIdentifier } from "@aws-amplify/plugin-types";
import { S3Client } from "@aws-sdk/client-s3";
import { ResourceNotFoundException } from "@aws-sdk/client-dynamodb";
import { MigrationTableClient } from "../../migration/migration_table_client.js";
import { S3ExportClient } from "../../export/s3_export_client.js";
import { printer } from "../../printer.js";

export async function handler(backendIdentifier: BackendIdentifier) {
  const migrationTableClient = new MigrationTableClient(backendIdentifier);
  const s3Client = new S3Client();
  const s3ExportClient = new S3ExportClient({
    backendIdentifier,
    s3Client,
  });
  try {
    const tableName = await migrationTableClient.destroyMigrationTable();
    printer.log(
      `Destroyed migration table: ${tableName} for ${backendIdentifier.type} ${backendIdentifier.name}`
    );
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      printer.log(
        `Migration table does not exist for ${backendIdentifier.type} ${backendIdentifier.name}`
      );
    } else {
      throw error;
    }
  }
  const bucketName = await s3ExportClient.destroyBucket();
  printer.log(
    `Destroyed S3 bucket: ${bucketName} for ${backendIdentifier.type} ${backendIdentifier.name}`
  );
}

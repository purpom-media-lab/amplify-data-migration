import * as path from "node:path";
import { printer } from "../printer.js";
import { MigrationContext } from "../types/context.js";
import { Migration } from "../types/migration.js";
import { DynamoDBModelClient } from "./dynamodb_model_client.js";
import { MigrationTableClient } from "./migration_table_client.js";
import * as fsp from "node:fs/promises";
import { DynamoDBTableProvider } from "./dynamodb_table_provider.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DefaultDynamoDBTableExporterFactory } from "../export/default_dynamodb_table_exporter_factory.js";
import { S3Client } from "@aws-sdk/client-s3";
import { DefaultDynamoDBTableExportFactory } from "../export/default_dynamodb_table_export_factory.js";

export class MigrationRunner {
  private readonly migrationsDir: string;
  private readonly dynamoDBClient: DynamoDBClient;
  private readonly s3Client: S3Client;
  private readonly s3Bucket: string;
  private readonly migrationTableClient: MigrationTableClient;
  private readonly dynamoDBTableProvider: DynamoDBTableProvider;

  constructor({
    migrationsDir,
    dynamoDBClient,
    s3Bucket,
    s3Client,
    migrationTableClient,
    dynamoDBTableProvider,
  }: {
    migrationsDir: string;
    dynamoDBClient: DynamoDBClient;
    s3Bucket: string;
    s3Client: S3Client;
    migrationTableClient: MigrationTableClient;
    dynamoDBTableProvider: DynamoDBTableProvider;
  }) {
    this.migrationsDir = path.isAbsolute(migrationsDir)
      ? migrationsDir
      : path.join(process.cwd(), migrationsDir);
    this.dynamoDBClient = dynamoDBClient;
    this.s3Bucket = s3Bucket;
    this.s3Client = s3Client;
    this.migrationTableClient = migrationTableClient;
    this.dynamoDBTableProvider = dynamoDBTableProvider;
  }

  public async export(): Promise<void> {
    const migrations = await this.getPendingMigrations();
    const pendingExports = migrations.filter(
      (migration) => typeof migration.export === "function"
    ) as Required<Migration>[];
    if (pendingExports.length === 0) {
      printer.log("No pending export migrations");
      return;
    }
    if (pendingExports.length > 1) {
      throw new Error("Only one export migration is allowed at a time");
    }
    const s3Bucket = this.s3Bucket;
    const tables = await this.dynamoDBTableProvider.getDynamoDBTables();
    const dynamoDBTableExporterFactory =
      new DefaultDynamoDBTableExporterFactory({
        tables,
        dynamoDBClient: this.dynamoDBClient,
        s3Bucket,
      });
    const dynamoDBTableExportFactory = new DefaultDynamoDBTableExportFactory(
      this.s3Client,
      s3Bucket
    );
    const modelClient = new DynamoDBModelClient({
      dynamoDBClient: this.dynamoDBClient,
      tables,
      dynamoDBTableExporterFactory,
      dynamoDBTableExportFactory,
    });
    const pendingExport = pendingExports[0];
    const exported = await pendingExport.export({ tables, modelClient });
    // Save exported data to migration table
    await this.migrationTableClient.saveExported({
      ...pendingExport,
      exported,
    });
  }

  public async run(): Promise<void> {
    const migrations = await this.getPendingMigrations();
    if (migrations.length === 0) {
      printer.log("No pending migrations");
      return;
    }
    for (const migration of migrations) {
      await this.runMigration(migration);
      await this.migrationTableClient.saveExecutedMigration(migration);
    }
  }

  private async createMigrationContext(
    migration: Migration
  ): Promise<MigrationContext> {
    const s3Bucket = this.s3Bucket;
    const tables = await this.dynamoDBTableProvider.getDynamoDBTables();
    const exported = await this.migrationTableClient.getExported(migration);
    const dynamoDBTableExporterFactory =
      new DefaultDynamoDBTableExporterFactory({
        tables,
        dynamoDBClient: this.dynamoDBClient,
        s3Bucket,
      });
    const dynamoDBTableExportFactory = new DefaultDynamoDBTableExportFactory(
      this.s3Client,
      s3Bucket
    );
    const modelClient = new DynamoDBModelClient({
      dynamoDBClient: this.dynamoDBClient,
      tables,
      exported,
      dynamoDBTableExporterFactory,
      dynamoDBTableExportFactory,
    });
    const context: MigrationContext = {
      tables,
      exported: exported ?? {},
      modelClient,
    };
    return context;
  }

  private async getPendingMigrations(): Promise<Migration[]> {
    const migrations = await this.getMigrations();
    const lastMigrationTimestamp =
      await this.migrationTableClient.getLastMigrationTimestamp();
    if (lastMigrationTimestamp === undefined) {
      return migrations;
    }

    const pendingMigrations = migrations.filter(
      (migration) => migration.timestamp > lastMigrationTimestamp
    );

    return pendingMigrations;
  }

  private async runMigration(migration: Migration) {
    printer.log(`Running migration: ${migration.name}`);
    const context = await this.createMigrationContext(migration);
    await migration.run(context);
    printer.log(`Ran migration: ${migration.name}`);
  }

  /**
   * Get all user's migrations in source codes.
   */
  private async getMigrations(): Promise<Migration[]> {
    const files = (
      await fsp.readdir(this.migrationsDir, { withFileTypes: true })
    )
      .filter(
        (dirent) =>
          dirent.isFile() &&
          (dirent.name.endsWith(".js") ||
            (dirent.name.endsWith(".ts") && !dirent.name.endsWith(".d.ts")))
      )
      .map((dirent) => dirent.name);
    const migrations = await Promise.all(
      files.map(async (file) => {
        const migrationPath = path.join(this.migrationsDir, file);
        return new (await import(migrationPath)).default() as Migration;
      })
    );
    migrations.sort((a, b) => a.timestamp - b.timestamp);
    return migrations;
  }
}

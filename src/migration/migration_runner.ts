import * as path from "node:path";
import { printer } from "../printer.js";
import { MigrationContext } from "../types/context.js";
import { Migration } from "../types/migration.js";
import { DynamoDBModelClient } from "./dynamodb_model_client.js";
import { MigrationTableClient } from "./migration_table_client.js";
import * as fsp from "node:fs/promises";
import { DynamoDBTableProvider } from "./dynamodb_table_provider.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export class MigrationRunner {
  private readonly migrationsDir: string;
  private readonly dynamoDBClient: DynamoDBClient;
  private readonly migrationTableClient: MigrationTableClient;
  private readonly dynamoDBTableProvider: DynamoDBTableProvider;

  constructor({
    migrationsDir,
    dynamoDBClient,
    migrationTableClient,
    dynamoDBTableProvider,
  }: {
    migrationsDir: string;
    dynamoDBClient: DynamoDBClient;
    migrationTableClient: MigrationTableClient;
    dynamoDBTableProvider: DynamoDBTableProvider;
  }) {
    this.migrationsDir = path.isAbsolute(migrationsDir)
      ? migrationsDir
      : path.join(process.cwd(), migrationsDir);
    this.dynamoDBClient = dynamoDBClient;
    this.migrationTableClient = migrationTableClient;
    this.dynamoDBTableProvider = dynamoDBTableProvider;
  }

  public async export(): Promise<void> {
    const migrations = await this.getPendingMigrations();
    const pendingExports = migrations.filter(
      (migration) => typeof migration.export === "function"
    ) as Required<Migration>[];
    if (pendingExports.length === 0) {
      return;
    }
    if (pendingExports.length > 1) {
      throw new Error("Only one export migration is allowed at a time");
    }
    const tables = await this.dynamoDBTableProvider.getDynamoDBTables();
    const pendingExport = pendingExports[0];
    const exported = await pendingExport.export({ tables });
    // Save exported data to migration table
    await this.migrationTableClient.saveExported({
      ...pendingExport,
      exported,
    });
  }

  public async run(): Promise<void> {
    const migrations = await this.getPendingMigrations();
    for (const migration of migrations) {
      await this.runMigration(migration);
      await this.migrationTableClient.saveExecutedMigration(migration);
    }
  }

  private async createMigrationContext(
    migration: Migration
  ): Promise<MigrationContext> {
    const tables = await this.dynamoDBTableProvider.getDynamoDBTables();
    const exported = await this.migrationTableClient.getExported(migration);
    const modelClient = new DynamoDBModelClient({
      dynamoDBClient: this.dynamoDBClient,
      tables,
      exported,
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
      .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".js"))
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

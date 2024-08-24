import * as path from "node:path";
import { printer } from "../printer.js";
import { MigrationContext } from "../types/context.js";
import { Migration } from "../types/migration.js";
import { DynamoDBModelClient } from "./dynamodb_model_client.js";
import { MigrationTableClient } from "./migration_table_client.js";
import * as fsp from "node:fs/promises";
import { getDynamoDBTables } from "./dynamodb_tables.js";

export class MigrationRunner {
  private readonly appId: string;
  private readonly branch: string;
  private readonly migrationsDir: string;
  private readonly migrationTableClient: MigrationTableClient;

  constructor({
    appId,
    branch,
    migrationsDir,
    migrationTableClient,
  }: {
    appId: string;
    branch: string;
    migrationsDir: string;
    migrationTableClient: MigrationTableClient;
  }) {
    this.appId = appId;
    this.branch = branch;
    this.migrationsDir = migrationsDir;
    this.migrationTableClient = migrationTableClient;
  }

  public async run(): Promise<void> {
    const migrations = await this.getPendingMigrations();
    for (const migration of migrations) {
      await this.runMigration(migration);
      await this.migrationTableClient.saveExecutedMigration(migration);
    }
  }

  private async createMigrationContext() {
    const tables = await getDynamoDBTables({
      appId: this.appId,
      branch: this.branch,
    });
    // TODO: exportedはMigrationTableから取得する
    const modelClient = new DynamoDBModelClient({ tables, exported: {} });
    const context: MigrationContext = {
      tables,
      exported: {},
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
    const context = await this.createMigrationContext();
    await migration.run(context);
    printer.log(`Running migration: ${migration.name}`);
  }

  /**
   * Get all user's migrations in source codes.
   */
  private async getMigrations(): Promise<Migration[]> {
    const migrationsDir = path.isAbsolute(this.migrationsDir)
      ? this.migrationsDir
      : path.join(process.cwd(), this.migrationsDir);
    const files = (await fsp.readdir(migrationsDir, { withFileTypes: true }))
      .filter((dirent) => dirent.isFile())
      .map((dirent) => dirent.name);
    const migrations = await Promise.all(
      files.map(async (file) => {
        const migrationPath = path.join(migrationsDir, file);
        return (await import(migrationPath)) as Migration;
      })
    );
    migrations.sort((a, b) => a.timestamp - b.timestamp);
    return migrations;
  }
}

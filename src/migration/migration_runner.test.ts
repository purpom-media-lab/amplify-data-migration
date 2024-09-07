import * as path from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { MigrationTableClient } from "./migration_table_client.js";
import {
  setupData,
  waitUntilActive,
  waitUntilDeleted,
} from "../test/dynamodb.js";
import { MigrationRunner } from "./migration_runner.js";
import { DynamoDBTableProvider } from "./dynamodb_table_provider.js";

describe("MigrationRunner", () => {
  let dynamoDBClient: DynamoDBClient;
  let dynamoDBDocumentClient: DynamoDBDocumentClient;
  let migrationTableClient: MigrationTableClient;
  let dynamoDBTableProvider: DynamoDBTableProvider;
  let migrationRunner: MigrationRunner;
  beforeAll(async () => {
    dynamoDBClient = new DynamoDBClient({
      ...(process.env.MOCK_DYNAMODB_ENDPOINT && {
        endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
        region: "local",
      }),
    });
    dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);
    migrationTableClient = new MigrationTableClient(
      "appId",
      "branch",
      dynamoDBClient
    );
    dynamoDBTableProvider = new (class implements DynamoDBTableProvider {
      async getDynamoDBTables(): Promise<Record<string, string>> {
        return {
          Todo: "TodoTable",
        };
      }
    })();
    migrationRunner = new MigrationRunner({
      migrationsDir: path.join(
        __dirname,
        "migration_runner.test",
        "pending_migrations"
      ),
      dynamoDBClient,
      migrationTableClient,
      dynamoDBTableProvider,
    });
  });

  describe("run", () => {
    let migrationTable: string;

    beforeEach(async () => {
      migrationTable = await migrationTableClient.createMigrationTable();
      await waitUntilActive(dynamoDBClient, migrationTable);
      const cleanupFn = await setupData(dynamoDBDocumentClient, "TodoTable", [
        {
          id: "1",
          title: "title_1",
        },
        {
          id: "2",
          title: "title_2",
        },
        {
          id: "3",
          title: "title_3",
        },
      ]);
      return async () => {
        await migrationTableClient.destroyMigrationTable();
        await waitUntilDeleted(dynamoDBClient, migrationTable);
        await cleanupFn();
      };
    });

    test("executes pending migrations", async () => {
      expect(await migrationTableClient.getExecutedMigrations()).toHaveLength(
        0
      );

      await migrationRunner.run();

      const output = await dynamoDBDocumentClient.send(
        new ScanCommand({ TableName: "TodoTable" })
      );
      expect(output.Count).toBe(3);
      expect(output.Items).toContainEqual({
        id: "1",
        title: "TITLE_1",
        description: "description for 1",
      });
      expect(output.Items).toContainEqual({
        id: "2",
        title: "TITLE_2",
        description: "description for 2",
      });
      expect(output.Items).toContainEqual({
        id: "3",
        title: "TITLE_3",
        description: "description for 3",
      });

      const executedMigrations =
        await migrationTableClient.getExecutedMigrations();
      expect(executedMigrations).toHaveLength(2);
      expect(executedMigrations).toEqual([
        {
          action: "run",
          timestamp: 1725285846599,
          name: "migration_1",
          executedAt: expect.any(String),
        },
        {
          action: "run",
          timestamp: 1725285846600,
          name: "migration_2",
          executedAt: expect.any(String),
        },
      ]);
    });

    test.todo(
      "does not execute migrations that have already been executed",
      async () => {
        const migrationTable = migrationTableClient.generateTableName();
        const executedAt = new Date().toISOString();
        dynamoDBDocumentClient.send(
          new PutCommand({
            TableName: migrationTable,
            Item: {
              action: { S: "run" },
              timestamp: { N: "1725285846599" },
              name: { S: "migration_1" },
              executedAt: { S: executedAt },
            },
          })
        );
        dynamoDBDocumentClient.send(
          new PutCommand({
            TableName: migrationTable,
            Item: {
              action: { S: "run" },
              timestamp: { N: "1725285846600" },
              name: { S: "migration_2" },
              executedAt: { S: executedAt },
            },
          })
        );

        expect(await migrationTableClient.getExecutedMigrations()).toHaveLength(
          2
        );

        await migrationRunner.run();

        const output = await dynamoDBDocumentClient.send(
          new ScanCommand({ TableName: "TodoTable" })
        );
        expect(output.Count).toBe(3);
        expect(output.Items).toContainEqual({
          id: "1",
          title: "TITLE_1",
          description: "description for 1",
        });
        expect(output.Items).toContainEqual({
          id: "2",
          title: "TITLE_2",
          description: "description for 2",
        });
        expect(output.Items).toContainEqual({
          id: "3",
          title: "TITLE_3",
          description: "description for 3",
        });

        const executedMigrations =
          await migrationTableClient.getExecutedMigrations();
        expect(executedMigrations).toHaveLength(2);
        expect(executedMigrations).toEqual([
          {
            action: "run",
            timestamp: 1725285846599,
            name: "migration_1",
            executedAt,
          },
          {
            action: "run",
            timestamp: 1725285846600,
            name: "migration_2",
            executedAt,
          },
        ]);
      }
    );
  });
});

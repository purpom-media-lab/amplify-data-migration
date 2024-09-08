import * as path from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { MigrationTableClient } from "./migration_table_client.js";
import {
  createTodoTable,
  deleteTable,
  setupData,
  waitUntilActive,
  waitUntilDeleted,
} from "../test/dynamodb.js";
import { MigrationRunner } from "./migration_runner.js";
import {
  AmplifyDynamoDBTable,
  DynamoDBTableProvider,
} from "./dynamodb_table_provider.js";
import { S3Client } from "@aws-sdk/client-s3";

describe("MigrationRunner", () => {
  let s3Client: S3Client;
  let dynamoDBClient: DynamoDBClient;
  let dynamoDBDocumentClient: DynamoDBDocumentClient;
  let migrationTableClient: MigrationTableClient;
  let dynamoDBTableProvider: DynamoDBTableProvider;
  let migrationRunner: MigrationRunner;

  beforeAll(() => {
    dynamoDBClient = new DynamoDBClient({
      endpoint: "http://localhost:4566",
      region: "ap-northeast-1",
    });
  });

  beforeEach(async (context) => {
    const todoTableName = `TodoTable${context.task.id}`;
    dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);
    migrationTableClient = new MigrationTableClient(
      "appId",
      context.task.id,
      dynamoDBClient
    );
    await createTodoTable(dynamoDBClient, todoTableName);
    dynamoDBTableProvider = new (class implements DynamoDBTableProvider {
      async getDynamoDBTables(): Promise<Record<string, AmplifyDynamoDBTable>> {
        return {
          Todo: {
            tableName: todoTableName,
            tableArn: `arn:aws:dynamodb:ap-northeast-1:123456789012:table/${todoTableName}`,
            modelName: "Todo",
          },
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
      s3Bucket: "amplify-migration-export", //TODO: Set up S3 bucket for localstack
      s3Client,
      migrationTableClient,
      dynamoDBTableProvider,
    });

    return async () => {
      await deleteTable(dynamoDBClient, todoTableName);
    };
  });

  afterAll(() => {
    dynamoDBClient.destroy();
  });

  describe("run", () => {
    let migrationTable: string;

    beforeEach(async (context) => {
      migrationTable = await migrationTableClient.createMigrationTable();
      await waitUntilActive(dynamoDBClient, migrationTable);
      const cleanupFn = await setupData(
        dynamoDBDocumentClient,
        `TodoTable${context.task.id}`,
        [
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
        ]
      );
      return async () => {
        await migrationTableClient.destroyMigrationTable();
        await waitUntilDeleted(dynamoDBClient, migrationTable);
        await cleanupFn();
      };
    });

    test("executes pending migrations", async (context) => {
      expect(await migrationTableClient.getExecutedMigrations()).toHaveLength(
        0
      );

      await migrationRunner.run();

      const output = await dynamoDBDocumentClient.send(
        new ScanCommand({ TableName: `TodoTable${context.task.id}` })
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

    test("does not execute migrations that have already been executed", async (context) => {
      const migrationTable = migrationTableClient.generateTableName();
      const executedAt = new Date().toISOString();
      await dynamoDBDocumentClient.send(
        new PutCommand({
          TableName: migrationTable,
          Item: {
            action: "run",
            timestamp: 1725285846599,
            name: "migration_1",
            executedAt: executedAt,
          },
        })
      );
      await dynamoDBDocumentClient.send(
        new PutCommand({
          TableName: migrationTable,
          Item: {
            action: "run",
            timestamp: 1725285846600,
            name: "migration_2",
            executedAt: executedAt,
          },
        })
      );

      expect(await migrationTableClient.getExecutedMigrations()).toHaveLength(
        2
      );

      await migrationRunner.run();

      const output = await dynamoDBDocumentClient.send(
        new ScanCommand({ TableName: `TodoTable${context.task.id}` })
      );
      expect(output.Count).toBe(3);
      expect(output.Items).toContainEqual({
        id: "1",
        title: "title_1",
      });
      expect(output.Items).toContainEqual({
        id: "2",
        title: "title_2",
      });
      expect(output.Items).toContainEqual({
        id: "3",
        title: "title_3",
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
    });
  });
});

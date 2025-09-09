import {
  describe,
  beforeEach,
  expect,
  test,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";
import {
  DeleteTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { MigrationTableClient } from "./migration_table_client.js";
import { waitUntilActive, waitUntilDeleted } from "../test/dynamodb.js";

describe("MigrationTableClient", () => {
  let dynamoDBClient: DynamoDBClient;
  let dynamoDBDocumentClient: DynamoDBDocumentClient;
  let migrationTableClient: MigrationTableClient;

  beforeAll(() => {
    dynamoDBClient = new DynamoDBClient({
      endpoint: "http://localhost:4566",
      region: "ap-northeast-1",
    });
  });

  afterAll(() => {
    dynamoDBClient.destroy();
  });

  beforeEach(async (context) => {
    dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);
    migrationTableClient = new MigrationTableClient(
      "appId",
      context.task.id,
      dynamoDBClient
    );
  });

  describe("createMigrationTable", () => {
    test("creates a migration table", async () => {
      const migrationTable = await migrationTableClient.createMigrationTable();

      const output = await dynamoDBClient.send(
        new DescribeTableCommand({ TableName: migrationTable })
      );
      expect(output.Table).toBeDefined();
      expect(output.Table?.TableName).toBe(migrationTable);
      expect(output.Table?.KeySchema).toEqual([
        {
          AttributeName: "action",
          KeyType: "HASH",
        },
        {
          AttributeName: "timestamp",
          KeyType: "RANGE",
        },
      ]);

      await waitUntilActive(dynamoDBClient, migrationTable);

      await dynamoDBClient.send(
        new DeleteTableCommand({ TableName: migrationTable })
      );

      await waitUntilDeleted(dynamoDBClient, migrationTable);
    });
  });

  describe("destroyMigrationTable", () => {
    test("destroys a migration table", async () => {
      const migrationTable = await migrationTableClient.createMigrationTable();
      await waitUntilActive(dynamoDBClient, migrationTable);
      await migrationTableClient.destroyMigrationTable();
      await waitUntilDeleted(dynamoDBClient, migrationTable);
      try {
        await dynamoDBClient.send(
          new DescribeTableCommand({ TableName: migrationTable })
        );
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.name).toBe("ResourceNotFoundException");
      }
    });
  });

  describe("getLastMigrationTimestamp", () => {
    let migrationTable: string;

    beforeEach(async () => {
      migrationTable = await migrationTableClient.createMigrationTable();
      await waitUntilActive(dynamoDBClient, migrationTable);
      return async () => {
        await migrationTableClient.destroyMigrationTable();
        await waitUntilDeleted(dynamoDBClient, migrationTable);
      };
    });

    test("returns undefined when no migrations have been executed", async () => {
      const lastMigrationTimestamp =
        await migrationTableClient.getLastMigrationTimestamp();
      expect(lastMigrationTimestamp).toBeUndefined();
    });

    test("returns the timestamp of the last migration executed", async () => {
      const timestamp = Date.now();
      await dynamoDBDocumentClient.send(
        new PutCommand({
          TableName: migrationTable,
          Item: { action: "run", name: "migration_1", timestamp: timestamp },
        })
      );
      await dynamoDBDocumentClient.send(
        new PutCommand({
          TableName: migrationTable,
          Item: {
            action: "run",
            name: "migration_2",
            timestamp: timestamp + 1,
          },
        })
      );

      const lastMigrationTimestamp =
        await migrationTableClient.getLastMigrationTimestamp();
      expect(lastMigrationTimestamp).toBe(timestamp + 1);
    });
  });

  describe("saveExecutedMigration", () => {
    let migrationTable: string;

    beforeEach(async () => {
      migrationTable = await migrationTableClient.createMigrationTable();
      await waitUntilActive(dynamoDBClient, migrationTable);
      return async () => {
        await migrationTableClient.destroyMigrationTable();
        await waitUntilDeleted(dynamoDBClient, migrationTable);
      };
    });

    test("saves a migration to the migration table", async () => {
      const timestamp = Date.now();
      await migrationTableClient.saveExecutedMigration({
        name: "migration_1",
        timestamp,
      });

      const output = await dynamoDBDocumentClient.send(
        new ScanCommand({ TableName: migrationTable })
      );
      expect(output.Count).toBe(1);
      expect(output.Items).toEqual([
        {
          action: "run",
          name: "migration_1",
          timestamp,
          executedAt: expect.any(String),
        },
      ]);
    });
  });
});

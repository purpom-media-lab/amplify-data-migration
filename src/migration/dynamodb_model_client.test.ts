import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBModelClient } from "./dynamodb_model_client.js";
import { ModelTransformer } from "../types/model_client.js";
import { createTodoTable, deleteTable, setupData } from "../test/dynamodb.js";

describe("DynamoDBModelClient", () => {
  let modelClient: DynamoDBModelClient;
  let dynamoDBClient: DynamoDBClient;
  let dynamoDBDocumentClient: DynamoDBDocumentClient;

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
    const todoTableName = `TodoTable${context.task.id}`;
    await createTodoTable(dynamoDBClient, todoTableName);
    modelClient = new DynamoDBModelClient({
      dynamoDBClient,
      tables: {
        Todo: {
          tableName: todoTableName,
          tableArn:
            "arn:aws:dynamodb:ap-northeast-1:123456789012:table/TodoTable",
          modelName: "Todo",
        },
      },
      exported: {
        Todo: {
          strategy: "PITR",
          key: "AWSDynamoDB/01725803054816-222a3242/manifest-summary.json",
        },
      },
      dynamoDBTableExporterFactory: {
        create: () => {
          throw new Error("Not implemented");
        },
      },
      dynamoDBTableExportFactory: {
        async getExport(key) {
          return {
            async *items(): AsyncGenerator<any> {
              yield { id: "1", title: "title_1" };
              yield { id: "2", title: "title_2" };
              yield { id: "3", title: "title_3" };
            },
          };
        },
      },
    });
    dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);
    return setupData(dynamoDBDocumentClient, todoTableName, [
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
  });

  afterEach(async (context) => {
    await await deleteTable(dynamoDBClient, `TodoTable${context.task.id}`);
  });

  describe("updateModel", () => {
    test("updates model with returned value by transformer function", async (context) => {
      type Todo = { id: string; title: string };
      const transformer: ModelTransformer<Todo, Todo> = async (oldModel) => {
        return { ...oldModel, title: oldModel.title.toUpperCase() };
      };
      await modelClient.updateModel("Todo", transformer);

      const todoTableName = `TodoTable${context.task.id}`;
      const output = await dynamoDBDocumentClient.send(
        new ScanCommand({ TableName: todoTableName })
      );
      expect(output.Count).toBe(3);
      expect(output.Items).toContainEqual({ id: "1", title: "TITLE_1" });
      expect(output.Items).toContainEqual({ id: "2", title: "TITLE_2" });
      expect(output.Items).toContainEqual({ id: "3", title: "TITLE_3" });
    });
  });

  describe("runImport", () => {
    test("imports items", async (context) => {
      const tableName = `TodoTable${context.task.id}`;
      type Todo = { id: string; title: string };
      const transformer: ModelTransformer<Todo, Todo> = async (oldModel) => {
        return { ...oldModel, title: oldModel.title.toUpperCase() };
      };

      await modelClient.runImport("Todo", transformer);

      const output = await dynamoDBDocumentClient.send(
        new ScanCommand({ TableName: tableName })
      );
      expect(output.Count).toBe(3);
      expect(output.Items).toContainEqual({ id: "1", title: "TITLE_1" });
      expect(output.Items).toContainEqual({ id: "2", title: "TITLE_2" });
      expect(output.Items).toContainEqual({ id: "3", title: "TITLE_3" });
    });
  });

  describe("putModel", () => {
    test("puts model with generator function", async (context) => {
      await modelClient.putModel("Todo", async function* () {
        yield { id: "4", title: "title_4" };
        yield { id: "5", title: "title_5" };
        yield { id: "6", title: "title_6" };
      });

      const todoTableName = `TodoTable${context.task.id}`;
      const output = await dynamoDBDocumentClient.send(
        new ScanCommand({ TableName: todoTableName })
      );
      expect(output.Count).toBe(6);
      expect(output.Items).toContainEqual({ id: "4", title: "title_4" });
      expect(output.Items).toContainEqual({ id: "5", title: "title_5" });
      expect(output.Items).toContainEqual({ id: "6", title: "title_6" });
    });

    test("puts model with generator function returning over 25 models", async (context) => {
      await modelClient.putModel("Todo", async function* () {
        for (let i = 0; i < 30; i++) {
          yield { id: `${i}`, title: `title_${i}` };
        }
      });

      const todoTableName = `TodoTable${context.task.id}`;
      const output = await dynamoDBDocumentClient.send(
        new ScanCommand({ TableName: todoTableName })
      );
      expect(output.Count).toBe(30);
    });

    test("puts model with array of models", async (context) => {
      await modelClient.putModel("Todo", [
        { id: "4", title: "title_4" },
        { id: "5", title: "title_5" },
        { id: "6", title: "title_6" },
      ]);

      const todoTableName = `TodoTable${context.task.id}`;
      const output = await dynamoDBDocumentClient.send(
        new ScanCommand({ TableName: todoTableName })
      );
      expect(output.Count).toBe(6);
      expect(output.Items).toContainEqual({ id: "4", title: "title_4" });
      expect(output.Items).toContainEqual({ id: "5", title: "title_5" });
      expect(output.Items).toContainEqual({ id: "6", title: "title_6" });
    });

    test("puts model with array of over 25 models", async (context) => {
      const models = [];
      for (let i = 0; i < 30; i++) {
        models.push({ id: `${i}`, title: `title_${i}` });
      }
      await modelClient.putModel("Todo", models);

      const todoTableName = `TodoTable${context.task.id}`;
      const output = await dynamoDBDocumentClient.send(
        new ScanCommand({ TableName: todoTableName })
      );
      expect(output.Count).toBe(30);
    });
  });
});

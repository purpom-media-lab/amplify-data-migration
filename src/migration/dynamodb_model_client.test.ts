import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBModelClient } from "./dynamodb_model_client.js";
import { ModelTransformer } from "../types/model_client.js";
import { setupData } from "../test/dynamodb.js";

describe("DynamoDBModelClient", () => {
  let modelClient: DynamoDBModelClient;
  let dynamoDBClient: DynamoDBClient;
  let dynamoDBDocumentClient: DynamoDBDocumentClient;

  beforeAll(async () => {
    dynamoDBClient = new DynamoDBClient({
      ...(process.env.MOCK_DYNAMODB_ENDPOINT && {
        endpoint: process.env.MOCK_DYNAMODB_ENDPOINT,
        region: "local",
      }),
    });
    modelClient = new DynamoDBModelClient({
      dynamoDBClient,
      tables: {
        Todo: "TodoTable",
      },
    });
    dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);
  });

  beforeEach(async () => {
    return setupData(dynamoDBDocumentClient, "TodoTable", [
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

  describe("updateModel", () => {
    test("updates model with returned value by transformer function", async () => {
      type Todo = { id: string; title: string };
      const transformer: ModelTransformer<Todo, Todo> = async (oldModel) => {
        return { ...oldModel, title: oldModel.title.toUpperCase() };
      };
      await modelClient.updateModel("Todo", transformer);

      const output = await dynamoDBDocumentClient.send(
        new ScanCommand({ TableName: "TodoTable" })
      );
      expect(output.Count).toBe(3);
      expect(output.Items).toContainEqual({ id: "1", title: "TITLE_1" });
      expect(output.Items).toContainEqual({ id: "2", title: "TITLE_2" });
      expect(output.Items).toContainEqual({ id: "3", title: "TITLE_3" });
    });
  });

  afterAll(() => {
    dynamoDBClient.destroy();
  });
});

import { vi } from "vitest";
import {
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  KeyType,
  ScalarAttributeType,
} from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

export const waitUntilActive = async (
  dynamoDBClient: DynamoDBClient,
  tableName: string,
  options?: { timeout?: number; interval?: number }
) => {
  await vi.waitUntil(
    async () =>
      (
        await dynamoDBClient.send(
          new DescribeTableCommand({ TableName: tableName })
        )
      ).Table?.TableStatus === "ACTIVE",
    options
  );
};

export const waitUntilDeleted = async (
  dynamoDBClient: DynamoDBClient,
  tableName: string,
  options?: { timeout?: number; interval?: number }
) => {
  await vi.waitUntil(async () => {
    try {
      await dynamoDBClient.send(
        new DescribeTableCommand({ TableName: tableName })
      );
      return false;
    } catch (error: any) {
      if (error.name === "ResourceNotFoundException") {
        return true;
      }
      return false;
    }
  }, options);
};

export const createTable = async (
  dynamoDBClient: DynamoDBClient,
  tableName: string,
  keySchema: { AttributeName: string; KeyType: KeyType }[],
  AttributeDefinitions: {
    AttributeName: string;
    AttributeType: ScalarAttributeType;
  }[]
) => {
  await dynamoDBClient.send(
    new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: AttributeDefinitions,
      KeySchema: keySchema,
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    })
  );
};

export const deleteTable = async (
  dynamoDBClient: DynamoDBClient,
  tableName: string
) => {
  await dynamoDBClient.send(
    new DeleteTableCommand({
      TableName: tableName,
    })
  );
};

export const setupData = async (
  dynamoDBDocumentClient: DynamoDBDocumentClient,
  tableName: string,
  items: Record<string, any>[]
) => {
  const requestItems = items.map((item) => ({
    PutRequest: {
      Item: item,
    },
  }));
  await dynamoDBDocumentClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [tableName]: requestItems,
      },
    })
  );
  const deleteRequestItems = items.map((item) => ({
    DeleteRequest: {
      Key: {
        id: item.id,
      },
    },
  }));
  return () => async () => {
    await dynamoDBDocumentClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: deleteRequestItems,
        },
      })
    );
  };
};

export const createTodoTable = async (
  dynamoDBClient: DynamoDBClient,
  todoTableName: string
) => {
  await createTable(
    dynamoDBClient,
    todoTableName,
    [
      {
        AttributeName: "id",
        KeyType: "HASH",
      },
    ],
    [
      {
        AttributeName: "id",
        AttributeType: "S",
      },
    ]
  );
};

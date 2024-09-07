import { vi } from "vitest";
import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
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

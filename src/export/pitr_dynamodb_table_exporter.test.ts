import {
  DescribeExportCommand,
  DynamoDBClient,
  ExportTableToPointInTimeCommand,
} from "@aws-sdk/client-dynamodb";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { PITRDynamoDBTableExporter } from "./pitr_dynamodb_table_exporter.js";
import { S3ExportClient } from "./s3_export_client.js";
import { S3Client } from "@aws-sdk/client-s3";

describe("PITRDynamoDBTableExporter", () => {
  let dynamoDBClient: DynamoDBClient;
  let dynamoDBClientMock;
  let s3Client: S3Client;
  let s3ExportClient: S3ExportClient;
  beforeAll(async () => {
    s3Client = new S3Client({
      endpoint: `http://s3.localhost.localstack.cloud:4566`,
      region: "ap-northeast-1",
    });
  });

  afterAll(() => {
    s3Client.destroy();
  });

  beforeEach(async (context) => {
    dynamoDBClient = new DynamoDBClient({});
    s3ExportClient = new S3ExportClient({
      s3Client,
      appId: "appId",
      branch: context.task.id,
    });
    const bucketName = await s3ExportClient.createBucket();
    return async () => {
      await s3ExportClient.destroyBucket();
    };
  });

  describe("runExport", () => {
    test("exports items", async (context) => {
      const tableName = `TodoTable${context.task.id}`;

      const dynamoDBClientMock = mockClient(dynamoDBClient);
      dynamoDBClientMock.on(ExportTableToPointInTimeCommand, {}).resolvesOnce({
        ExportDescription: {
          ExportArn:
            "arn:aws:dynamodb:ap-northeast-1:123456789012:table/TodoTable/export/01725803054816-222a3242",
          ExportStatus: "IN_PROGRESS",
          ExportTime: new Date(),
          TableArn: `arn:aws:dynamodb:ap-northeast-1:123456789012:table/${tableName}`,
        },
      });
      dynamoDBClientMock
        .on(DescribeExportCommand, {})
        .resolvesOnce({
          ExportDescription: {
            ExportArn:
              "arn:aws:dynamodb:ap-northeast-1:123456789012:table/TodoTable/export/01725803054816-222a3242",
            ExportStatus: "IN_PROGRESS",
            ExportTime: new Date(),
            TableArn: `arn:aws:dynamodb:ap-northeast-1:123456789012:table/${tableName}`,
          },
        })
        .resolvesOnce({
          ExportDescription: {
            ExportArn:
              "arn:aws:dynamodb:ap-northeast-1:123456789012:table/TodoTable/export/01725803054816-222a3242",
            ExportStatus: "COMPLETED",
            ExportTime: new Date(),
            TableArn: `arn:aws:dynamodb:ap-northeast-1:123456789012:table/${tableName}`,
            ExportManifest:
              "AWSDynamoDB/01725803054816-222a3242/manifest-summary.json",
          },
        });

      const bucketName = s3ExportClient.generateBucketName();
      const exporter = new PITRDynamoDBTableExporter(
        dynamoDBClient,
        bucketName,
        {
          tableName,
          tableArn: `arn:aws:dynamodb:ap-northeast-1:123456789012:table/${tableName}`,
          modelName: "Todo",
        }
      );
      const exportKey = await exporter.runExport();
      expect(exportKey).toEqual({
        strategy: "PITR",
        key: "AWSDynamoDB/01725803054816-222a3242/manifest-summary.json",
      });
    });
  });
});

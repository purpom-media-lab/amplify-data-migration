import * as path from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { PITRDynamoDBExport } from "./pitr_dynamodb_table_export.js";
import { S3ExportClient } from "./s3_export_client.js";
import { clear, upload } from "../test/s3.js";
import { createBranchBackendIdentifier } from "../types/environment_identifier.js";

describe("PITRDynamoDBExport", () => {
  let s3Client: S3Client;
  let s3ExportClient: S3ExportClient;
  beforeAll(async () => {
    s3Client = new S3Client({
      endpoint: `http://s3.localhost.localstack.cloud:4566`,
      region: "ap-northeast-1",
    });
  });

  afterAll(async () => {
    s3Client.destroy();
  });

  beforeEach(async (context) => {
    s3ExportClient = new S3ExportClient({
      s3Client,
      backendIdentifier: createBranchBackendIdentifier("appId", context.task.id),
    });
    const bucketName = await s3ExportClient.createBucket();
    return async () => {
      await clear(s3Client, bucketName);
      await s3ExportClient.destroyBucket();
    };
  });

  describe("items", () => {
    test("exports items", async (context) => {
      const bucketName = s3ExportClient.generateBucketName();
      const srcDir = path.join(__dirname, "pitr_dynamodb_table_export.test");
      await upload({ s3Client, bucket: bucketName, srcDir });
      const exportSummaryKey =
        "AWSDynamoDB/01725803054816-222a3242/manifest-summary.json";
      const dynamoDBExport = new PITRDynamoDBExport(
        s3Client,
        bucketName,
        exportSummaryKey
      );

      const items = [];
      for await (const item of dynamoDBExport.items()) {
        items.push(item);
      }
      expect(items).toHaveLength(3);
      expect(items).toContainEqual({
        id: "1",
        title: "title_1",
      });
      expect(items).toContainEqual({
        id: "2",
        title: "title_2",
      });
      expect(items).toContainEqual({
        id: "3",
        title: "title_3",
      });
    });
  });
});

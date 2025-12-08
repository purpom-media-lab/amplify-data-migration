import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { S3ExportClient } from "./s3_export_client.js";
import {
  DeleteBucketCommand,
  HeadBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createBranchBackendIdentifier } from "../types/environment_identifier.js";

describe("S3ExportClient", () => {
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
    s3ExportClient = new S3ExportClient({
      s3Client,
      backendIdentifier: createBranchBackendIdentifier("appId", context.task.id),
    });
  });

  describe("createBucket", () => {
    test("creates a bucket", async () => {
      const bucketName = await s3ExportClient.createBucket();
      const output = await s3Client.send(
        new HeadBucketCommand({ Bucket: bucketName })
      );
      expect(output.BucketRegion).toBe("ap-northeast-1");
      await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
    });

    test("deletes a bucket", async () => {
      const bucketName = await s3ExportClient.createBucket();
      const output = await s3Client.send(
        new HeadBucketCommand({ Bucket: bucketName })
      );
      expect(output.BucketRegion).toBe("ap-northeast-1");

      await s3ExportClient.destroyBucket();

      expect(async () => {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      }).rejects.toThrow();
    });
  });
});

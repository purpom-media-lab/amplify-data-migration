import * as path from "node:path";
import * as zlib from "node:zlib";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import type { DynamoDBExport } from "./types/dynamodb_table_exporter.js";

type ManifestSummary = {
  version: "2020-06-30";
  exportArn: string;
  startTime: string;
  endTime: string;
  tableArn: string;
  tableId: string;
  exportTime: string;
  s3Bucket: string;
  s3Prefix: string | null;
  s3SseAlgorithm: "AES256";
  s3SseKmsKeyId: string | null;
  manifestFilesS3Key: string;
  billedSizeBytes: number;
  itemCount: number;
  outputFormat: "DYNAMODB_JSON";
};

type ManifestLine = {
  itemCount: number;
  md5Checksum: string;
  etag: string;
  dataFileS3Key: string;
};

export class PITRDynamoDBExport<TModel extends object>
  implements DynamoDBExport<TModel>
{
  constructor(
    private readonly s3Client: S3Client,
    private readonly s3Bucket: string,
    private readonly exportSummaryKey: string
  ) {}

  private async readManifest(): Promise<ManifestLine[]> {
    const summary = await this.readObject<ManifestSummary>(
      this.exportSummaryKey
    );
    return this.readLines<ManifestLine>(summary.manifestFilesS3Key);
  }

  private async readObject<T>(key: string): Promise<T> {
    const output = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      })
    );
    const body = await output.Body?.transformToString();
    if (!body) {
      throw new Error(`${key} is empty`);
    }
    return JSON.parse(body);
  }

  private async readLines<T>(fileKey: string): Promise<T[]> {
    const output = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: fileKey,
      })
    );
    let body: string | undefined;
    if (path.extname(fileKey) === ".json") {
      body = await output.Body?.transformToString();
    } else if (path.extname(fileKey) === ".gz") {
      const byteArray = await output.Body?.transformToByteArray();
      body = await new Promise<string>((resolve, reject) => {
        zlib.gunzip(byteArray!, (err, result) => {
          if (err) {
            reject(err);
          }
          resolve(result.toString("utf-8"));
        });
      });
    }
    if (!body) {
      // empty *.json.gz file
      return [];
    }
    return body
      .split(/\r?\n/)
      .filter((line) => !!line.trim())
      .map((line) => {
        return JSON.parse(line);
      });
  }

  private async readDataFile(fileKey: string): Promise<TModel[]> {
    const items = await this.readLines(fileKey);
    return items.map(
      (item) =>
        unmarshall(
          (item as any).Item as Record<string, AttributeValue>
        ) as TModel
    );
  }

  async *items(): AsyncGenerator<TModel, void, void> {
    const fileManifests = await this.readManifest();
    for (const element of fileManifests) {
      const dataFileS3Key = element.dataFileS3Key;
      const items = await this.readDataFile(dataFileS3Key);
      for (const item of items) {
        yield item;
      }
    }
  }
}

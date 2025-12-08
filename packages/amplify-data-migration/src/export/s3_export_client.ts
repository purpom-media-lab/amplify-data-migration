import {
  CreateBucketCommand,
  DeleteBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { BackendIdentifier } from "../types/index.js";
import { getResourceNameSuffix } from "../types/environment_identifier.js";

export class S3ExportClient {
  private readonly backendIdentifier: BackendIdentifier;
  private readonly s3Client: S3Client;

  constructor({
    backendIdentifier,
    s3Client,
  }: {
    backendIdentifier: BackendIdentifier;
    s3Client: S3Client;
  }) {
    this.backendIdentifier = backendIdentifier;
    this.s3Client = s3Client;
  }

  generateBucketName() {
    const suffix = getResourceNameSuffix(this.backendIdentifier);
    const namespace = this.backendIdentifier.namespace
      .replaceAll("_", "-")
      .toLocaleLowerCase();
    return `amplify-export-${namespace}-${suffix}`;
  }

  async createBucket(): Promise<string> {
    const bucketName = this.generateBucketName();
    console.log(`Creating bucket: ${bucketName}`);
    await this.s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
    return bucketName;
  }

  async destroyBucket() {
    const bucketName = this.generateBucketName();
    const command = new DeleteBucketCommand({
      Bucket: bucketName,
    });
    await this.s3Client.send(command);
    return bucketName;
  }
}

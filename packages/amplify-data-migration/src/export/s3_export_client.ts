import {
  CreateBucketCommand,
  DeleteBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export class S3ExportClient {
  private readonly appId: string;
  private readonly branch: string;
  private readonly s3Client: S3Client;

  constructor({
    appId,
    branch,
    s3Client,
  }: {
    appId: string;
    branch: string;
    s3Client: S3Client;
  }) {
    this.appId = appId;
    this.branch = branch;
    this.s3Client = s3Client;
  }

  generateBucketName() {
    const branch = this.branch.replaceAll("_", "-").toLocaleLowerCase();
    const appId = this.appId.replaceAll("_", "-").toLocaleLowerCase();
    return `amplify-export-${appId}-${branch}`;
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

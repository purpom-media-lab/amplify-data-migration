import * as path from "node:path";
import * as fs from "node:fs";
import { glob } from "glob";
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export const upload = async ({
  srcDir,
  s3Client,
  bucket,
}: {
  srcDir: string;
  s3Client: S3Client;
  bucket: string;
}) => {
  const dir = path.isAbsolute(srcDir)
    ? srcDir
    : path.join(process.cwd(), srcDir);
  const files = await glob(`${dir}/**/*`, { nodir: true });
  await Promise.all(
    files.map(async (file) =>
      s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: path.posix.relative(dir, file),
          Body: await fs.promises.readFile(file),
        })
      )
    )
  );
};

export const clear = async (s3Client: S3Client, bucket: string) => {
  let continuationToken: string | undefined;
  do {
    const listOutput = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      })
    );
    continuationToken = listOutput.ContinuationToken;
    const objects =
      listOutput.Contents?.map((content) => ({
        Key: content.Key,
      })) ?? [];
    await s3Client.send(
      new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects } })
    );
  } while (continuationToken);
  // const listOutput = await s3Client.send(
  //   new ListObjectsV2Command({ Bucket: bucket })
  // );
  // listOutput.ContinuationToken;
  // const objects =
  //   listOutput.Contents?.map((content) => ({
  //     Key: content.Key,
  //   })) ?? [];
  // await s3Client.send(
  //   new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects } })
  // );
};

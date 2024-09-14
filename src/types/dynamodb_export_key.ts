export type DynamoDBExportKey = {
  strategy: "PITR" | "ON_DEMAND";
  key: string;
};

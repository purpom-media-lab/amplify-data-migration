/**
 * Represents the key of the data exported from DynamoDB.
 */
export type DynamoDBExportKey = {
  /**
   * The strategy used to export the data.
   */
  strategy: "PITR" | "ON_DEMAND";
  /**
   * The key of the data exported from DynamoDB.
   */
  key: string;
};

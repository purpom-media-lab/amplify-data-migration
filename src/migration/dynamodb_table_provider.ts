export interface DynamoDBTableProvider {
  getDynamoDBTables(): Promise<Record<string, string>>;
}

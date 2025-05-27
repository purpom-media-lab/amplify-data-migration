export interface DynamoDBTableProvider {
  getDynamoDBTables(): Promise<Record<string, AmplifyDynamoDBTable>>;
}

export type AmplifyDynamoDBTable = {
  modelName: string;
  tableName: string;
  tableArn: string;
};

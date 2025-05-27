import { AmplifyClient, GetBranchCommand } from "@aws-sdk/client-amplify";
import {
  AmplifyDynamoDBTable,
  DynamoDBTableProvider,
} from "./types/dynamodb_table_provider.js";
import {
  CloudFormationClient,
  DescribeStackResourcesCommand,
} from "@aws-sdk/client-cloudformation";

export class DefaultDynamoDBTableProvider implements DynamoDBTableProvider {
  readonly appId: string;
  readonly branch: string;
  constructor({ appId, branch }: { appId: string; branch: string }) {
    this.appId = appId;
    this.branch = branch;
  }
  async getDynamoDBTables(): Promise<Record<string, AmplifyDynamoDBTable>> {
    const amplifyClient = new AmplifyClient();
    const output = await amplifyClient.send(
      new GetBranchCommand({
        appId: this.appId,
        branchName: this.branch,
      })
    );
    const backend = output.branch?.backend;
    if (!backend) {
      throw new Error(
        `Backend not found for appId: ${this.appId}, branch: ${this.branch}`
      );
    }
    const stackArn = backend.stackArn;
    if (!stackArn) {
      throw new Error(
        `stack not found for appId: ${this.appId}, branch: ${this.branch}`
      );
    }
    return this.collectDynamoDBTables(this.stackArnToStackName(stackArn));
  }

  stackArnToStackName(stackArn: string): string {
    const parts = stackArn.split("/");
    return parts[1];
  }

  private async collectDynamoDBTables(
    stackName: string,
    tables: Record<string, AmplifyDynamoDBTable> = {}
  ): Promise<Record<string, AmplifyDynamoDBTable>> {
    const cloudformationClient = new CloudFormationClient();
    const output = await cloudformationClient.send(
      new DescribeStackResourcesCommand({ StackName: stackName })
    );
    const AmplifyDynamoDBTables = output.StackResources?.filter(
      (resource) => resource.ResourceType === "Custom::AmplifyDynamoDBTable"
    );
    if (AmplifyDynamoDBTables) {
      tables = AmplifyDynamoDBTables.reduce((acc, table) => {
        if (!table.PhysicalResourceId) {
          throw new Error(`PhysicalResourceId not found for ${table}`);
        }
        if (!table.LogicalResourceId) {
          throw new Error(`LogicalResourceId not found for ${table}`);
        }
        const modelName = table.LogicalResourceId.replace(/Table$/, "");
        const region = table.StackId?.split(":")[3];
        const accountId = table.StackId?.split(":")[4];
        return {
          ...acc,
          [modelName]: {
            tableName: table.PhysicalResourceId,
            tableArn: `arn:aws:dynamodb:${region}:${accountId}:table/${table.PhysicalResourceId}`,
            modelName,
          },
        };
      }, tables);
    }
    const stacks = output.StackResources?.filter(
      (resource) => resource.ResourceType === "AWS::CloudFormation::Stack"
    );
    if (stacks) {
      for (const stack of stacks) {
        if (!stack.PhysicalResourceId) {
          throw new Error(`PhysicalResourceId not found for ${stack}`);
        }
        const collectedTables = await this.collectDynamoDBTables(
          this.stackArnToStackName(stack.PhysicalResourceId),
          tables
        );
        if (collectedTables) {
          tables = { ...tables, ...collectedTables };
        }
      }
    }
    return tables;
  }
}

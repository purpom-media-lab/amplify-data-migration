import { AmplifyClient, GetBranchCommand } from "@aws-sdk/client-amplify";
import { DynamoDBTableProvider } from "./dynamodb_table_provider.js";
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
  async getDynamoDBTables(): Promise<Record<string, string>> {
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
    return this.collectDynamoDBTables(stackArn);
  }

  private async collectDynamoDBTables(
    rootStackArn: string,
    tables: Record<string, string> = {}
  ): Promise<Record<string, string>> {
    const cloudformationClient = new CloudFormationClient();
    const output = await cloudformationClient.send(
      new DescribeStackResourcesCommand({ PhysicalResourceId: rootStackArn })
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
        return { ...acc, [modelName]: table.PhysicalResourceId };
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
          stack.PhysicalResourceId,
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

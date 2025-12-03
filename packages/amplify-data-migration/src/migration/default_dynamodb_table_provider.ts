import { AmplifyClient, GetBranchCommand } from "@aws-sdk/client-amplify";
import {
  AmplifyDynamoDBTable,
  DynamoDBTableProvider,
} from "./types/dynamodb_table_provider.js";
import {
  CloudFormationClient,
  ListStackResourcesCommand,
  StackResourceSummary,
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
    const region = stackArn.split(":")[3];
    const accountId = stackArn.split(":")[4];
    return this.collectDynamoDBTables(region, accountId, this.stackArnToStackName(stackArn));
  }

  stackArnToStackName(stackArn: string): string {
    const parts = stackArn.split("/");
    return parts[1];
  }

  private async listStackResources(
    stackName: string
  ): Promise<StackResourceSummary[]> {
    const cloudformationClient = new CloudFormationClient();
    let nextToken: string | undefined = undefined;
    const summaries: StackResourceSummary[] = [];
    do {
      const output = await cloudformationClient.send(
        new ListStackResourcesCommand({ StackName: stackName })
      );
      summaries.push(...(output.StackResourceSummaries ?? []));
      nextToken = output.NextToken;
    } while (nextToken);
    return summaries;
  }
  private async collectDynamoDBTables(
    region: string,
    accountId: string,
    stackName: string,
    tables: Record<string, AmplifyDynamoDBTable> = {}
  ): Promise<Record<string, AmplifyDynamoDBTable>> {
    const cloudformationClient = new CloudFormationClient();
    const stackResourceSummaries = await this.listStackResources(stackName);
    const AmplifyDynamoDBTables = stackResourceSummaries?.filter(
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
    const stacks = stackResourceSummaries?.filter(
      (resource) => resource.ResourceType === "AWS::CloudFormation::Stack"
    );
    if (stacks) {
      for (const stack of stacks) {
        if (!stack.PhysicalResourceId) {
          throw new Error(`PhysicalResourceId not found for ${stack}`);
        }
        const collectedTables = await this.collectDynamoDBTables(
          region,
          accountId,
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

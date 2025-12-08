import { AmplifyClient, GetBranchCommand } from "@aws-sdk/client-amplify";
import {
  AmplifyDynamoDBTable,
  DynamoDBTableProvider,
} from "./types/dynamodb_table_provider.js";
import {
  CloudFormationClient,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  ListStackResourcesOutput,
  StackResourceSummary,
} from "@aws-sdk/client-cloudformation";
import type { BackendIdentifier } from "../types/index.js";
import { BackendIdentifierConversions } from "@aws-amplify/platform-core";

export class DefaultDynamoDBTableProvider implements DynamoDBTableProvider {
  private readonly backendIdentifier: BackendIdentifier;
  private readonly cloudFormationClient: CloudFormationClient;
  private readonly amplifyClient: AmplifyClient;

  constructor({ backendIdentifier }: { backendIdentifier: BackendIdentifier }) {
    this.backendIdentifier = backendIdentifier;
    this.cloudFormationClient = new CloudFormationClient({
      maxAttempts: 10,
    });
    this.amplifyClient = new AmplifyClient();
  }
  async getDynamoDBTables(): Promise<Record<string, AmplifyDynamoDBTable>> {
    const amplifyClient = this.amplifyClient;

    let stackArn: string | undefined;

    if (this.backendIdentifier.type === "branch") {
      // Get backend from branch
      const output = await amplifyClient.send(
        new GetBranchCommand({
          appId: this.backendIdentifier.namespace,
          branchName: this.backendIdentifier.name,
        })
      );
      const backend = output.branch?.backend;
      if (!backend) {
        throw new Error(
          `Backend not found for ${this.backendIdenntifierForMessage(
            this.backendIdentifier
          )}`
        );
      }
      stackArn = backend.stackArn;
    } else if (this.backendIdentifier.type === "sandbox") {
      // Get backend from sandbox
      const stackName = BackendIdentifierConversions.toStackName(
        this.backendIdentifier
      );
      const cfnClient = this.cloudFormationClient;
      const output = await cfnClient.send(
        new DescribeStacksCommand({ StackName: stackName })
      );
      const stack = output.Stacks?.[0];
      if (!stack) {
        throw new Error(
          `Stack not found for ${this.backendIdenntifierForMessage(
            this.backendIdentifier
          )}`
        );
      }
      stackArn = stack?.StackId;
    } else {
      throw new Error(
        `Unsupported backend identifier type: ${this.backendIdentifier}`
      );
    }

    if (!stackArn) {
      throw new Error(
        `stack not found for ${this.backendIdenntifierForMessage(
          this.backendIdentifier
        )}`
      );
    }
    const region = stackArn.split(":")[3];
    const accountId = stackArn.split(":")[4];

    const resouces = await this.listStackResources(
      this.stackArnToStackName(stackArn)
    );
    const dataStackResource = resouces
      .filter(
        (resource) => resource.ResourceType === "AWS::CloudFormation::Stack"
      )
      .find(
        (resource) =>
          resource.LogicalResourceId &&
          this.isDataStack(resource.LogicalResourceId)
      );

    if (!dataStackResource) {
      throw new Error(
        `data stack not found for ${this.backendIdenntifierForMessage(
          this.backendIdentifier
        )}`
      );
    }

    const dataStackArn = dataStackResource.PhysicalResourceId;
    if (!dataStackArn) {
      throw new Error(
        `PhysicalResourceId not found for data stack in ${this.backendIdenntifierForMessage(
          this.backendIdentifier
        )}`
      );
    }

    return this.collectDynamoDBTables(
      region,
      accountId,
      this.stackArnToStackName(dataStackArn)
    );
  }

  private backendIdenntifierForMessage(
    backendIdentifier: BackendIdentifier
  ): string {
    if (backendIdentifier.type === "branch") {
      return `appId: ${backendIdentifier.namespace}, branch: ${backendIdentifier.name}`;
    } else {
      return `namespace: ${backendIdentifier.namespace}, sandbox: ${backendIdentifier.name}`;
    }
  }

  stackArnToStackName(stackArn: string): string {
    const parts = stackArn.split("/");
    return parts[1];
  }

  private isDataStack(stackName: string): boolean {
    return /data[0-9A-F]{8}/.test(stackName);
  }

  private async listStackResources(
    stackName: string
  ): Promise<StackResourceSummary[]> {
    const cloudformationClient = this.cloudFormationClient;
    let nextToken: string | undefined = undefined;
    const summaries: StackResourceSummary[] = [];
    do {
      const output: ListStackResourcesOutput = await cloudformationClient.send(
        new ListStackResourcesCommand({
          StackName: stackName,
          NextToken: nextToken,
        })
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

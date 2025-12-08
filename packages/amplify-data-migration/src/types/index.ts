export type { Migration } from "./migration.js";
export type { DynamoDBExportKey } from "./dynamodb_export_key.js";
export type {
  ModelClient,
  ModelTransformer,
  ModelGenerator,
} from "./model_client.js";
export type { MigrationContext, ExportContext } from "./context.js";
export type { AttributeValue } from "@aws-sdk/client-dynamodb";
export type {
  BackendIdentifier,
  DeploymentType,
  AppId,
  BranchName,
  SandboxName,
} from "@aws-amplify/plugin-types";
export {
  createBranchBackendIdentifier,
  createSandboxBackendIdentifier,
  getResourceNameSuffix,
} from "./environment_identifier.js";

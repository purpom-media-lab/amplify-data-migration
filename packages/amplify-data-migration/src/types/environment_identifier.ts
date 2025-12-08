import type {
  BackendIdentifier,
  AppId,
  BranchName,
  SandboxName,
} from "@aws-amplify/plugin-types";

export type { BackendIdentifier, AppId, BranchName, SandboxName };
/**
 * Creates a backend identifier for a git branch deployment.
 */
export function createBranchBackendIdentifier(
  appId: AppId,
  branchName: BranchName
): BackendIdentifier {
  return {
    namespace: appId,
    name: branchName,
    type: "branch" as const,
  };
}

/**
 * Creates a backend identifier for a sandbox deployment.
 */
export function createSandboxBackendIdentifier(
  appId: AppId,
  sandboxName: SandboxName
): BackendIdentifier {
  return {
    namespace: appId,
    name: sandboxName,
    type: "sandbox" as const,
  };
}

/**
 * Generates a resource name suffix based on the backend identifier.
 * This is used for naming DynamoDB tables and S3 buckets.
 */
export function getResourceNameSuffix(identifier: BackendIdentifier): string {
  return identifier.name.replaceAll("_", "-").toLowerCase();
}

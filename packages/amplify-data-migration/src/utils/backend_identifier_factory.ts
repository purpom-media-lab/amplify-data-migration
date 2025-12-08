import { PackageJsonReader } from "@aws-amplify/platform-core";
import { createBranchBackendIdentifier, type BackendIdentifier } from "../types/environment_identifier.js";
import { LocalNamespaceResolver } from "./namespace_resolver.js";
import { SandboxIdentifierResolver } from "./sandbox_identifier_resolver.js";
import { userInfo } from "os";

export type BackendIdentifierOptions = {
  branch: string;
  appId: string;
} | {
  sandbox?: string;
};

/**
 * Factory class for creating BackendIdentifier based on command options
 */
export class BackendIdentifierFactory {
  /**
   * Creates a BackendIdentifier from command options
   * @param options - The command options containing branch, sandbox, and appId
   * @returns A promise that resolves to a BackendIdentifier
   * @throws Error if neither branch nor sandbox is specified, or if both are specified
   */
  static async create(options: BackendIdentifierOptions): Promise<BackendIdentifier> {
    if ("branch" in options) {
      const { branch, appId } = options;
      if (!appId) {
        throw new Error("--appId is required when using --branch");
      }
      return createBranchBackendIdentifier(appId, branch);
    } else {
      const { sandbox } = options;
      const namespaceResolver = new LocalNamespaceResolver(new PackageJsonReader());
      const sandboxResolver = new SandboxIdentifierResolver(namespaceResolver);
      return await sandboxResolver.resolve(sandbox);
    }
  }
}

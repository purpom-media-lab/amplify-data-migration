import { PackageJsonReader } from "@aws-amplify/platform-core";
import { createBranchBackendIdentifier, type BackendIdentifier } from "../types/environment_identifier.js";
import { LocalNamespaceResolver } from "./namespace_resolver.js";
import { SandboxIdentifierResolver } from "./sandbox_identifier_resolver.js";

export type BackendIdentifierOptions = {
  branch?: string;
  sandbox?: string;
  appId?: string;
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
    const { branch, sandbox, appId } = options;
    
    if (!branch && !sandbox) {
      throw new Error("Either --branch or --sandbox must be specified");
    }
    if (branch && sandbox) {
      throw new Error("Cannot specify both --branch and --sandbox");
    }
    
    if (branch) {
      if (!appId) {
        throw new Error("--appId is required when using --branch");
      }
      return createBranchBackendIdentifier(appId, branch);
    } else {
      const namespaceResolver = new LocalNamespaceResolver(new PackageJsonReader());
      const sandboxResolver = new SandboxIdentifierResolver(namespaceResolver);
      const sandboxName = typeof sandbox === 'string' ? sandbox : undefined;
      return await sandboxResolver.resolve(sandboxName);
    }
  }
}

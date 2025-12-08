import { userInfo as _userInfo } from "node:os";
import { NamespaceResolver } from "./namespace_resolver.js";
import type { BackendIdentifier } from "@aws-amplify/plugin-types";

/**
 * Resolves an ID that can be used to uniquely identify sandbox environments.
 * Compatible with @aws-amplify/backend-cli SandboxBackendIdResolver.
 */
export class SandboxIdentifierResolver {
  /**
   * Initialize with a namespace resolver
   */
  constructor(
    private readonly namespaceResolver: NamespaceResolver,
    private readonly userInfo = _userInfo
  ) {}

  /**
   * Returns a BackendIdentifier for sandbox with resolved namespace and username
   */
  resolve = async (identifier?: string): Promise<BackendIdentifier> => {
    const namespace = await this.namespaceResolver.resolve();
    const name = identifier || this.userInfo().username;
    return {
      namespace,
      name,
      type: "sandbox",
    };
  };
}

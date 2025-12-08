import { SandboxExportCommand } from "./sandbox_export_command.js";

export const createSandboxExportCommand = (): SandboxExportCommand => {
  return new SandboxExportCommand();
};

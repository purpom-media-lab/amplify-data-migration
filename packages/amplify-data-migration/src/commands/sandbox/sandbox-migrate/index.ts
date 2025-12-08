import { SandboxMigrateCommand } from "./sandbox_migrate_command.js";

export const createSandboxMigrateCommand = (): SandboxMigrateCommand => {
  return new SandboxMigrateCommand();
};

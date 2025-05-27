import { MigrateCommand } from "./migrate_command.js";

export const createMigrateCommand = (): MigrateCommand => {
  return new MigrateCommand();
};

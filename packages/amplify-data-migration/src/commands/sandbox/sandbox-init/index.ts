import { SandboxInitCommand } from "./sandbox_init_command.js";

export const createSandboxInitCommand = (): SandboxInitCommand => {
  return new SandboxInitCommand();
};

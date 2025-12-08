import { SandboxDestroyCommand } from "./sandbox_destroy_command.js";

export const createSandboxDestroyCommand = (): SandboxDestroyCommand => {
  return new SandboxDestroyCommand();
};

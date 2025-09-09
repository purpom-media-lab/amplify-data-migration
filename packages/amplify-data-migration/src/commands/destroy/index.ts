import { DestroyCommand } from "./destroy_command.js";

export const createDestroyCommand = (): DestroyCommand => {
  return new DestroyCommand();
};

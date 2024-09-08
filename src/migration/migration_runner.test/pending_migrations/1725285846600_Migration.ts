import {
  Migration,
  MigrationContext,
  ModelTransformer,
} from "../../../types/index.js";

export default class Migration1 implements Migration {
  name = "migration_2";
  timestamp = 1725285846600;
  async run(context: MigrationContext) {
    type Todo = { id: string; title: string; description: string };
    const transformer: ModelTransformer<Todo, Todo> = async (oldModel) => {
      return { ...oldModel, description: `description for ${oldModel.id}` };
    };
    await context.modelClient.updateModel("Todo", transformer);
  }
}

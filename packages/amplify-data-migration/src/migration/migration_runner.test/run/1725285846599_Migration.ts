import {
  Migration,
  MigrationContext,
  ModelTransformer,
} from "../../../types/index.js";

export default class Migration1 implements Migration {
  name = "migration_1";
  timestamp = 1725285846599;
  async run(context: MigrationContext) {
    type Todo = { id: string; title: string };
    const transformer: ModelTransformer<Todo, Todo> = async (oldModel) => {
      return { ...oldModel, title: oldModel.title.toUpperCase() };
    };
    await context.modelClient.updateModel("Todo", transformer);
  }
}

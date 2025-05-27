import {
  Migration,
  MigrationContext,
  ModelTransformer,
} from "@purpom-media-lab/amplify-data-migration";

export default class AddCompletedField_1725285846599 implements Migration {
  readonly name = "add_completed_field";
  readonly timestamp = 1725285846599;
  async run(context: MigrationContext) {
    type OldTodo = { id: string; content: string };
    type NewTodo = { id: string; content: string; completed: boolean };
    const transformer: ModelTransformer<OldTodo, NewTodo> = async (
      oldModel
    ) => {
      return { ...oldModel, completed: false };
    };
    await context.modelClient.updateModel("Todo", transformer);
  }
}

# Amplify Data Migration Tool

- [日本語](./README.ja.md)

### Features

- Implementation of migration in TypeScript
- Execute export using DynamoDB Point-In-Time Recovery
- Management of executed migrations

## Installation

```sh
npm install -D @purpom-media-lab/amplify-data-migration
```

## Usage

### Initialize

Creating a migration table

At the beginning (each app & branch), create a migration table and S3 bucket with the following command.

```sh
data-migration init --appId '<appId>' --branch '<branch name>' --profile '<profile name>'
```

### Create Migration File

Suppose the `Todo` model has already existed as follows.

```ts
const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
});
```

After the release, you will need a `completed` field, and you need to add the `completed` field to the `Todo` model as follows.

```ts
const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
      completed: a.boolean().required(),
    })
    .authorization((allow) => [allow.owner()]),
});
```

The change in the model adds a `completed` field, but the existing data in DynamoDB table does not have the `completed` field.
An error occurs when you try to get an existing record without the field, which is a required field, which is a required field, via `AppSync`.

You can implement migration processing in the implementation class with the` Migration` interface as follows.
The following is an example of a migration that adds a `completed` field with the value `false`.

```ts
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
```

You can create a migration file template by specifying the name of the migration:

```sh
data-migration create --name <migration file name> --migrationsDir <path to migration file directory>
```

### Run Migrations

When you run the `data-migration migrate` command as shown below, `amplify-data-migration` will run pending migrations.

```sh
data-migration migrate --appId '<appId>' --branch '<branch name>' --migrationsDir ./dist/migrations/ --profile '<profile name>'
```

### Migrate from export data with Point-in-Time Recovery

Suppose the `book` model exists as follows.

```ts
const schema = a.schema({
  Book: a.model({
    author: a.string(),
    title: a.string(),
  }),
});
```

After the release, it is necessary to change the `author`,` title` field as a key, and suppose you have changed the `Book` model as follows.

```ts
const schema = a.schema({
  Book: a
    .model({
      author: a.id().required(),
      title: a.string(),
    })
    .identifier(["author", "title"])
    .authorization((allow) => [allow.owner()]),
});
```

If you change the model key on AWS Amplify, the DynamoDB table is replace and the existing data is deleted.
Therefore, the existing data cannot be migrated by implementing the `Migration.run` function alone.
In this case, the export of existing data is implemented with the `Migration.export` function.

In the `Migration.export` function, you can export the existing data of the model by calling `context.modelClient.exportModel`.
And you can import the exported data into a table after replace by calling `context.modelClient.runImport` in `Migration.run` function.

```ts
import {
  ExportContext,
  Migration,
  MigrationContext,
  ModelTransformer,
} from "@purpom-media-lab/amplify-data-migration";

export default class ChangeBookKey_1725285846600 implements Migration {
  readonly name = "change_book_key";
  readonly timestamp = 1725285846600;

  async export(
    context: ExportContext
  ): Promise<Record<string, DynamoDBExportKey>> {
    // Export Book table to S3 bucket with Point-in-Time Recovery
    const key = await context.modelClient.exportModel("Book");
    return { Book: key };
  }

  async run(context: MigrationContext) {
    type OldBook = { id: string; author: string; title: string };
    type NewBook = { author: string; title: string };
    const newKeys: string[] = [];
    const transformer: ModelTransformer<OldBook, NewBook> = async (
      oldModel
    ) => {
      const { id, ...newModel } = oldModel;
      if (newKeys.includes(`${newModel.author}:${newModel.title}`)) {
        // Skip if the same key already exists.
        return null;
      }
      newKeys.push(`${newModel.author}:${newModel.title}`);
      return newModel;
    };
    // Import exported data to new Book table.
    await context.modelClient.runImport("Book", transformer);
  }
}
```

Run the `data-migration export` command as follows, and `amplify-data-migration` executes an export for pending migration.
Usually, this command is assumed to be called before executing the deployment with `npx ampx pipeline-deploy`.

```sh
data-migration export --appId '<appId>' --branch '<branch name>' --profile '<profile name>'
```

### Destroy

If you no longer want to use the Amplify Data Migration Tool, run the following command to destroy the migration table and S3 bucket.

```ts
data-migration destroy --appId '<appId>' --branch '<branch name>' --profile '<profile name>'
```

## Development

### Build

```sh
npm run build
```

### Test

We will use [LocalStack](https://github.com/localstack/localstack) for testing.
Before running the tests, please run the following command to start LocalStack.

```sh
docker-compose up
```

Run the test by executing the following command:

```sh
npm test
```

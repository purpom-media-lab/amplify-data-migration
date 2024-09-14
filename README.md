# Amplify Data Migration Tool

### 機能

- TypeScript でのマイグレーション処理の実装
- DynamoDB Point-In-Time Recovery を利用した export の実行
- 実行したマイグレーションの管理

## Installation

```sh
npm install -D @purpom-media-lab/amplify-data-migration
```

## Usage

### Initialize

マイグレーションテーブルの作成

最初（アプリ&環境毎）に、以下のコマンドでマイグレーションテーブルと S3 バケットを作成します。

```sh
data-migration init --appId '<appId>' --branch '<branch name>' --profile '<profile name>'
```

### Create Migration File

既に以下のように`Todo`モデルが存在したとします。

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

リリース後に`completed`フィールドが必要になり、以下のように`Todo`モデルに`completed`フィールドを追加する必要があります。

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

モデルの変更により、`completed`フィールドが追加されますが、DynamoDB にある既存のデータには`completed`フィールドは存在しません。
このままでは`required()`である`completed`フィールドがない既存レコードを AppSync で取得しようとするとエラーが発生します。

`amplify-data-migration`では以下のように`Migration`インタフェースを実装クラスにマイグレーション処理を実装します。
以下は、`false`をもつ`completed`フィールドを追加するマイグレーションです。

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

### Run Migrations

以下のように`data-migration migrate`コマンドを実行すると、`amplify-data-migration`は実行されていないマイグレーションを実行します。

```sh
data-migration migrate --appId '<appId>' --branch '<branch name>' --migrationsDir ./dist/migrations/ --profile '<profile name>'
```

### Migrate from export data with Point-in-Time Recovery

以下のように`Book`モデルが存在したとします。

```ts
const schema = a.schema({
  Book: a.model({
    author: a.string(),
    title: a.string(),
  }),
});
```

リリース後に`author`, `title`フィールドをキーにする変更が必要になり、以下のように`Book`モデルを変更したとします。

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

AWS Amplify ではモデルのキーを変更した場合、DynamoDB テーブルが replace され、既存データが破棄されます。
そのため、`Migration.run`関数の実装だけでは既存データをマイグレーションできません。
この場合、`Migration.export`関数で既存データのエクスポートを実装します。

`Migration.export`関数では`context.modelClient.exportModel`を呼び出すことでモデルの既存データをエクスポートすることができます。
そして、`Migration.run`関数で`context.modelClient.runImport`を呼び出すことでエクスポートしたデータを replace 後のテーブルにインポートすることができます。

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

以下のように`data-migration export`コマンドを実行すると、`amplify-data-migration`は実行されていないマイグレーションの export を実行します。
通常、このコマンドは`npx ampx pipeline-deploy`でデプロイを実行する前に呼び出すことを想定しています。
`

```sh
data-migration export --appId '<appId>' --branch '<branch name>' --profile '<profile name>'
```

### Destroy

Amplify Data Migration Tool の利用をやめる場合、以下のコマンドでマイグレーションテーブルと S3 バケットを破棄します。

```ts
data-migration destroy --appId '<appId>' --branch '<branch name>' --profile '<profile name>'
```

## Development

### Build

```sh
npm run build
```

### Test

テストには[LocalStack](https://github.com/localstack/localstack)を利用します。
テスト実行前に以下のコマンドを実行して LoaclStack を起動してください。

```sh
docker-compose up
```

以下のコマンドを実行してテストを実行します。

```sh
npm test
```

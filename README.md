# Amplify Data Migration Tool

データマイグレーションは TypeScript で書く（マイグレーションファイル）。

マイグレーションファイルは`Migration`インタフェースを実装したクラスとして実装する。

`run`関数でマイグレーション処理を実装、`export`でマイグレーション前のデータエクスポート処理を実装する。

`scheamHash`はそのマイグレーションファイルを実行する対象の GraphQL API(AppSync API)の状態(スキーマ定義)を決定するために使う。

マイグレーション実行時は未適用（未実行）のマイグレーションファイルの場合（実行履歴は専用の DynamoDB テーブルで管理される）のみ実行される。同じマイグレーションファイルを重複して適用しないために管理する。CI に組み込んだ時にスキーマ変更のないデプロイがあった時にも実行されてしまうと重複してマイグレーションが適用されてしまう。

## Installation

## Usage

マイグレーションテーブルの作成

初回（アプリ&環境毎）に、以下のコマンドでマイグレーションテーブルを作成する。

```ts
data-migration init --appId '<appId>' --branch '<branch name>' --profile '<profile name>'
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

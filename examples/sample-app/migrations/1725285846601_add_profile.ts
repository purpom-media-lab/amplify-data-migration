import {
  Migration,
  MigrationContext,
  ModelGenerator,
} from "../../../lib/index.js";

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient();

type Profile = {
  id: string;
  name: string;
  owner: string;
  createdAt?: string;
  updatedAt?: string;
};

export default class AddProfileModel_1725285846601 implements Migration {
  readonly name = "add_profile_model";
  readonly timestamp = 1725285846601;
  private userPoolId: string = process.env.USER_POOL_ID!;

  async run(context: MigrationContext) {
    const userPoolId = this.userPoolId;
    const generator: ModelGenerator<Profile> = async function* () {
      let token;
      do {
        const command: ListUsersCommand = new ListUsersCommand({
          UserPoolId: userPoolId,
          Limit: 100,
          PaginationToken: token,
        });
        const response = await client.send(command);
        token = response.PaginationToken;
        for (const user of response.Users ?? []) {
          yield {
            id: crypto.randomUUID(),
            name:
              user?.Attributes?.find((attribute) => attribute.Name === "Email")
                ?.Value ?? "",
            owner: user.Username!,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
      } while (token);
    };
    await context.modelClient.putModel("Profile", generator);
  }
}

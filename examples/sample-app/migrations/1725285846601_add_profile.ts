import {
  Migration,
  MigrationContext,
  ModelGenerator,
} from "@purpom-media-lab/amplify-data-migration";

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
          Limit: 20,
          PaginationToken: token,
        });
        const response = await client.send(command);
        token = response.PaginationToken;
        for (const user of response.Users ?? []) {
          const owner = `${user.Username}::${user.Username}`;
          const now = new Date().toISOString();
          yield {
            id: crypto.randomUUID(),
            name:
              user?.Attributes?.find((attribute) => attribute.Name === "Email")
                ?.Value ?? "",
            owner,
            createdAt: now,
            updatedAt: now,
          };
        }
      } while (token);
    };
    await context.modelClient.putModel("Profile", generator);
  }
}

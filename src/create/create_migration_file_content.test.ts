import { createMigrationClassContent } from "./create_migration_file_content";
import { describe, test, expect } from "vitest";

describe("createMigrationFileContent", () => {
  test("should return Migration file content", () => {
    const name = "test_migration";
    const timestamp = 1726384783922;
    const result = createMigrationClassContent(name, timestamp);
    expect(result).toMatchSnapshot();
  });
});

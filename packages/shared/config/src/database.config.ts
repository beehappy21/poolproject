export interface DatabaseConfig {
  url: string;
}

export const databaseConfig: DatabaseConfig = {
  url: "postgresql://user:password@localhost:5432/app",
};


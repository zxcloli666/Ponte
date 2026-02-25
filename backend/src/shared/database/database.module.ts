import { Module, Global } from "@nestjs/common";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export const DRIZZLE = Symbol("DRIZZLE");
export type DrizzleDB = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (): DrizzleDB => {
        const connectionString =
          Deno.env.get("DATABASE_URL") ?? "postgres://ponte:ponte@localhost:5432/ponte";
        const client = postgres(connectionString, { max: 20 });
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}

import bcrypt from "bcrypt";
import { Client, QueryConfig } from "pg";
import backendLogger from "../../../configs/BackendLogger.ts";
import { Quantities } from "./seed.ts";

export default async function seedUsers(
    db: Client,
    { users, saltRounds }: Quantities,
): Promise<void> {
    for (let i = 1; i < users + 1; i++) {
        const username: string = `user ${i}`;
        const pwHash: string = await bcrypt.hash(`password ${i}`, saltRounds);
        const email: string = `email${i}@email.com`;
        const sql: QueryConfig = {
            // TODO - find a better way to bulk insert w/ parametrized queries one day
            // Maybe sql file? Maybe  https://github.com/vitaly-t/pg-promise/wiki/Performance-Boost#the-solution?
            text: `
            INSERT INTO users (username, pw_hash, email, role)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            `,
            values: [username, pwHash, email, i === 1 ? "admin" : "client"],
        };
        backendLogger.debug("running sql: ", sql);
        const {
            rows: [pgUser],
        } = await db.query(sql);
        backendLogger.debug("result", pgUser);
    }
}

import { Client, QueryConfig } from "pg";
import { Quantities } from "./seed.ts";
import backendLogger from "../../../configs/BackendLogger.ts";

export default async function seedOrders(
    db: Client,
    { users, ordersPerUser }: Quantities,
): Promise<void> {
    for (let userId = 1; userId < users + 1; userId++) {
        // note that psql ids start @ 1
        for (let i = 1; i < ordersPerUser + 1; i++) {
            const mayI2000: string = `${i}-5-2000`;
            const status: "pending" | "completed" | "canceled" =
                i === ordersPerUser ? "pending" : "completed";
            const sql: QueryConfig = {
                text: `
                INSERT INTO orders (date, user_id, status)
                VALUES ($1, $2, $3)
                RETURNING id, date::text, user_id
                `,
                values: [mayI2000, userId, status],
            };
            backendLogger.debug("running sql: ", sql);
            const {
                rows: [pgOrder],
            } = await db.query(sql);
            backendLogger.debug("result", pgOrder);
        }
    }
}

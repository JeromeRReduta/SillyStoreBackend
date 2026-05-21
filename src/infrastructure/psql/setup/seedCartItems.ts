import { Client, QueryConfig } from "pg";
import { Quantities } from "./seed.ts";
import backendLogger from "../../../configs/BackendLogger.ts";
export default async function seedCartItems(
    db: Client,
    { users, ordersPerUser, productsPerOrder }: Quantities,
) {
    for (let userI = 0; userI < users; userI++) {
        for (let offset = 1; offset < ordersPerUser + 1; offset++) {
            const orderId: number = userI * ordersPerUser + offset;
            for (
                let productId = 1;
                productId < productsPerOrder + 1;
                productId++
            ) {
                // remember psql ids start @ 1
                const quantity: number = 5;
                const sql: QueryConfig = {
                    text: `
                    INSERT INTO cart_items (order_id, product_id, quantity)
                    VALUES ($1, $2, $3)
                    RETURNING *
                    `,
                    values: [orderId, productId, quantity],
                };
                backendLogger.debug("running sql: ", sql);
                const {
                    rows: [cartItem],
                } = await db.query(sql);
                backendLogger.debug("result: ", cartItem);
            }
        }
    }
}

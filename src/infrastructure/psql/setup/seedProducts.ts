import { Client, QueryConfig } from "pg";
import { Quantities } from "./seed.ts";
import backendLogger from "../../../configs/BackendLogger.ts";
export default async function seedProducts(
    db: Client,
    { products }: Quantities,
): Promise<void> {
    for (let i = 1; i < products + 1; i++) {
        const title: string = `title ${i}`;
        const description: string = `description ${i}`;
        const price: number = i * 1.11;
        const hideThePainHarold: string =
            "https://static.independent.co.uk/s3fs-public/thumbnails/image/2017/07/11/11/harold-0.jpg";
        const sql: QueryConfig = {
            text: `
            INSERT INTO products (title, description, price, image_src)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            values: [title, description, price, hideThePainHarold],
        };
        backendLogger.debug("running sql: ", sql);
        const {
            rows: [pgProduct],
        } = await db.query(sql);
        backendLogger.debug("result", pgProduct);
    }
}

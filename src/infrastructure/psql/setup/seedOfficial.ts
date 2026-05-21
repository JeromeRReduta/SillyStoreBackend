import { Client, Pool, QueryConfig, QueryConfigValues } from "pg";
import apiConfigs from "../../../configs/ApiConfigs.ts";
import backendLogger from "../../../configs/BackendLogger.ts";
import { default as officialTestUser } from "./officialTestUser.json" with { type: "json" };
import { default as officialProducts } from "./officialProducts.json" with { type: "json" };
import * as bcrypt from "bcrypt";

async function withLogs<E>({
    headMessage,
    tailMessage,
    callback,
}: {
    headMessage?: string;
    tailMessage?: string;
    callback: () => E | Promise<E>;
}) {
    if (headMessage) {
        backendLogger.info(headMessage);
    }
    const retVal: E = await callback();
    if (tailMessage) {
        backendLogger.info(tailMessage);
    }
    return retVal;
}

async function main(): Promise<void> {
    backendLogger.info("Beginning seed...");
    const { db } = apiConfigs;
    await withLogs({
        headMessage: "Connecting to db...",
        tailMessage: "Db connected!",
        callback: async () => {
            await db.connect();
        },
    });

    backendLogger.debug("OFFICIAL TEST USER", officialTestUser);
    backendLogger.debug("OFFICIAL PRODUCTS", officialProducts);

    await withLogs({
        headMessage: "Seeding the one test user...",
        callback: async () => {
            await seedTestUser(db);
        },
    });
    await withLogs({
        headMessage: "Seeding official products...",
        callback: async () => {
            await seedOfficialProducts(db);
        },
    });
    await withLogs({
        headMessage: "Closing db...",
        tailMessage: "Db connection closed!",
        callback: async () => {
            await db.end();
        },
    });
    backendLogger.info("Seeding complete!");
}

async function seedTestUser(db: Client | Pool): Promise<void> {
    const numSaltRounds = 10;
    const sql: QueryConfig = {
        text: `
            INSERT INTO users (username, pw_hash, email)
                SELECT
                    username,
                    $2,
                    email
                FROM json_populate_record(NULL::users, $1)
            RETURNING
                username,
                pw_hash,
                email        
        `,
        values: [
            JSON.stringify(officialTestUser),
            await bcrypt.hash(officialTestUser.pw, numSaltRounds),
        ],
    };
    backendLogger.debug("running sql", sql);
    const { rows } = await db.query(sql);
    backendLogger.debug("rows", rows);
}
async function seedOfficialProducts(db: Client | Pool): Promise<void> {
    backendLogger.info("recordset: ", officialProducts);
    const sql: QueryConfig = {
        text: `
            INSERT INTO products
            SELECT
                id,
                image_src,
                title,
                description,
                price
            FROM json_populate_recordset(NULL::products, $1)
            RETURNING
                id,
                image_src,
                title,
                description,
                price::decimal::float8
        `,
        values: [JSON.stringify(officialProducts)],
    };

    backendLogger.debug("running sql", sql);
    const { rows } = await db.query(sql);
    backendLogger.debug("rows", rows);
}

await main();

// async function main(): Promise<void> {
//     const { db } = apiConfigs as { db: Client };
//     backendLogger.info("Connecting to db...");
//     await db.connect();
//     backendLogger.info("Begin seeding...");
//     backendLogger.info("Seeding users...");
//     await seedUsers(db, quantities);
//     backendLogger.info("Seeding products...");
//     await seedProducts(db, quantities);
//     backendLogger.info("Seeding orders...");
//     await seedOrders(db, quantities);
//     backendLogger.info("Adding orders to products...");
//     await seedCartItems(db, quantities);
//     backendLogger.info("Closing db connection...");
//     await db.end();
//     backendLogger.info("Seeding complete! Ending process.");
// }

// main();

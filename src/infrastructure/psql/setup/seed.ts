import { type Client } from "pg";
import seedUsers from "./seedUsers.ts";
import seedProducts from "./seedProducts.ts";
import seedOrders from "./seedOrders.ts";
import seedCartItems from "./seedCartItems.ts";
import apiConfigs from "../../../configs/ApiConfigs.ts";
import backendLogger from "../../../configs/BackendLogger.ts";

export interface Quantities {
    readonly users: number;
    readonly products: number;
    readonly ordersPerUser: number;
    readonly saltRounds: number;
    readonly productsPerOrder: number;
}

const quantities: Quantities = {
    users: 5,
    products: 10,
    ordersPerUser: 2,
    saltRounds: 10,
    productsPerOrder: 2,
};

async function main(): Promise<void> {
    const { db } = apiConfigs as { db: Client };
    backendLogger.info("Connecting to db...");
    await db.connect();
    backendLogger.info("Begin seeding...");
    backendLogger.info("Seeding users...");
    await seedUsers(db, quantities);
    backendLogger.info("Seeding products...");
    await seedProducts(db, quantities);
    backendLogger.info("Seeding orders...");
    await seedOrders(db, quantities);
    backendLogger.info("Adding orders to products...");
    await seedCartItems(db, quantities);
    backendLogger.info("Closing db connection...");
    await db.end();
    backendLogger.info("Seeding complete! Ending process.");
}

await main();

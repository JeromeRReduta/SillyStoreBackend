import { Client, Pool, QueryConfig } from "pg";
import { ICartItemDao } from "../../data_access/ICartItemDao.ts";
import { ICartItem } from "../../../../SillyStoreCommon/domain-objects/CartItem.ts";
import {
    IGetPendingCartItemsRequest,
    ICartItemResponse,
    IMergeCartItemsInOrderRequest,
    IMergePendingCartItemsRequest,
    IGetAllCartItemsRequest,
    IGetCartItemRequest,
    IUpdateCartItemRequest,
    IDeleteCartItemRequest,
    ICreateCartItemRequest,
    IGetCartItemsInOrderRequest,
} from "../../../../SillyStoreCommon/dtos/cartItemDtos.ts";
import PgDaos from "../../data_access/PgDaos.ts";
import backendLogger from "../../../configs/BackendLogger.ts";

/* eslint-disable @typescript-eslint/no-unused-vars */
export default class PgCartItemDao implements ICartItemDao {
    private db: Client | Pool;
    private formattedOrderSql: string;
    private withDetailedCartItemSql: string;

    constructor(db: Client | Pool) {
        this.db = db;
        this.formattedOrderSql = `
            id,
            TO_CHAR(date, 'yyyy-mm-dd') AS date,
            user_id,
            status
        `;
        this.withDetailedCartItemSql = `
            WITH detailed_cart_items AS (
                SELECT 
                    o.user_id AS creator_id,
                    o.id AS order_id,
                    p.id AS product_id,
                    p.description,
                    p.image_src,
                    p.price::decimal::float8,
                    c.quantity,
                    o.status,
                    p.title
                FROM cart_items AS c
                JOIN products AS p
                    ON p.id = c.product_id
                JOIN orders AS o
                    ON o.id = c.order_id
            )
        `;
    }

    async createAsync({
        orderId,
        productId,
        quantity,
    }: ICreateCartItemRequest): Promise<ICartItem> {
        const sql: QueryConfig = {
            text: `
                INSERT INTO cart_items (order_id, product_id, quantity)

                VALUES ($1, $2, $3)
                ON CONFLICT (order_id, product_id) DO UPDATE
                    SET quantity = $3
                RETURNING *
            `,
            values: [orderId, productId, quantity],
        };
        const rows: ICartItemResponse[] = await PgDaos.queryAsync(
            this.db,
            sql,
            PgDaos.cartItemMapper,
        );
        if (rows.length !== 1) {
            throw Error(
                "error - create should return exactly 1 entry but returned " +
                    rows.length,
            );
        }
        return rows[0];
    }
    async getAllAsync(dto: IGetAllCartItemsRequest): Promise<ICartItem[]> {
        throw new Error("Method not implemented.");
    }
    async getAsync(dto: IGetCartItemRequest): Promise<ICartItem | null> {
        throw new Error("Method not implemented.");
    }
    async updateAsync(dto: IUpdateCartItemRequest): Promise<ICartItem | null> {
        throw new Error("Method not implemented.");
    }
    async deleteAsync(dto: IDeleteCartItemRequest): Promise<ICartItem | null> {
        throw new Error("Method not implemented.");
    }
    async getAllPendingAsync({
        creatorId,
    }: IGetPendingCartItemsRequest): Promise<ICartItemResponse[]> {
        // readonly creator_id?: ICartItem["creatorId"];
        // readonly order_id: ICartItem["orderId"];
        // readonly product_id: ICartItem["productId"];
        // readonly description: ICartItem["description"];
        // readonly image_src: ICartItem["imageSrc"];
        // readonly price: ICartItem["price"];
        // readonly quantity: ICartItem["quantity"];
        // readonly title: ICartItem["title"];

        const sql: QueryConfig = {
            text: `
                ${this.withDetailedCartItemSql}
                SELECT 
                    creator_id,
                    order_id,
                    product_id,
                    description,
                    image_src,
                    price,
                    quantity,
                    title    
                FROM detailed_cart_items
                WHERE detailed_cart_items.status = 'pending'
                    AND detailed_cart_items.creator_id = $1
            `,
            values: [creatorId],
        };
        return await PgDaos.queryAsync(this.db, sql, PgDaos.cartItemMapper);
    }

    async getAllInOrderAsync({
        creatorId,
        orderId,
    }: IGetCartItemsInOrderRequest): Promise<ICartItemResponse[]> {
        const sql: QueryConfig = {
            text: `
                ${this.withDetailedCartItemSql}
                SELECT
                    creator_id,
                    order_id,
                    product_id,
                    description,
                    image_src,
                    price,
                    quantity,
                    title    
                FROM detailed_cart_items
                WHERE detailed_cart_items.creator_id = $1
                    AND detailed_cart_items.order_id = $2
            `,
            values: [creatorId, orderId],
        };
        return await PgDaos.queryAsync(this.db, sql, PgDaos.cartItemMapper);
    }

    async mergeCartInOrderAsync(
        dto: IMergeCartItemsInOrderRequest,
    ): Promise<ICartItemResponse[]> {
        throw new Error("Method not implemented.");
    }
    async mergePendingCartAsync({
        creatorId,
        cartItems,
    }: IMergePendingCartItemsRequest): Promise<void> {
        const newOrder = await this.db.query({
            text: `
            INSERT into orders (date, status, user_id)
            VALUES (CURRENT_DATE, 'pending', $1)
            ON CONFLICT
                DO NOTHING
            RETURNING ${this.formattedOrderSql}
            `,
            values: [creatorId],
        });
        backendLogger.debug("new order", newOrder);
        const getIdSql: QueryConfig = {
            text: `
                SELECT DISTINCT id FROM orders
                WHERE status = 'pending'
                    AND user_id = $1
            `,
            values: [creatorId],
        };
        const idRows: number[] = await PgDaos.queryAsync(
            this.db,
            getIdSql,
            (e: { id: number }) => {
                return e.id;
            },
        );
        backendLogger.debug("id rows", idRows);
        if (idRows.length !== 1) {
            throw new Error(
                "idk what happened but the sql messed up here - should always return 1",
            );
        }
        const pendingOrderId: number = idRows[0];
        await this.db.query(
            `CREATE TEMP TABLE cart_items_new (LIKE cart_items)`,
        );
        await this.db.query({
            text: `
                WITH objs AS 
                   (
                        SELECT *
                        FROM json_to_recordset($2)
                        AS x("productId" INT, "quantity" INT)
                    )
                INSERT INTO cart_items_new (order_id, product_id, quantity)
                SELECT $1::int AS order_id, "productId", quantity FROM
                    objs
                RETURNING *
            `,
            values: [pendingOrderId, JSON.stringify(cartItems)],
        });
        // ty https://stackoverflow.com/questions/52315874/how-to-correct-migrate-merge-statement-with-not-matched-by-target-from-ms-sq
        // ty https://stackoverflow.com/questions/35159431/on-conflict-do-update-has-missing-from-clause
        await this.db.query({
            text: `
                WITH upsert(order_id, product_id) AS (
                    INSERT INTO cart_items (order_id, product_id, quantity)
                    SELECT order_id, product_id, quantity FROM cart_items_new
                    ON CONFLICT (order_id, product_id)
                        DO UPDATE SET
                            quantity = excluded.quantity
                    RETURNING order_id, product_id
                )
                DELETE FROM cart_items
                    WHERE order_id = $1
                    AND product_id NOT IN (SELECT product_id FROM upsert)

            `,
            values: [pendingOrderId],
        });
        await this.db.query("DROP TABLE cart_items_new");
    }
}

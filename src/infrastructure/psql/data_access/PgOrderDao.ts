import { Client, Pool, QueryConfig } from "pg";
import {
    ICreateOrderRequest,
    IOrderResponse,
    IGetAllOrdersRequest,
    IGetOrderRequest,
    IUpdateOrderRequest,
    IDeleteOrderRequest,
    IGetAllPendingOrdersRequest,
    IUpdatePendingOrderRequest,
} from "../../../../SillyStoreCommon/dtos/orderDtos.ts";
import backendLogger from "../../../configs/BackendLogger.ts";
import { IOrderDao } from "../../data_access/IOrderDao.ts";
import PgDaos from "../../data_access/PgDaos.ts";

/* eslint-disable @typescript-eslint/no-unused-vars */
export default class PgOrderDao implements IOrderDao {
    private db: Client | Pool;

    constructor(db: Client | Pool) {
        this.db = db;
    }

    async createAsync({
        dateStr,
        userId,
        status,
    }: ICreateOrderRequest): Promise<IOrderResponse> {
        const sql: QueryConfig = {
            text: `
                INSERT INTO orders (date, user_id, status)
                VALUES ($1, $2, $3)
                RETURNING
                    id,
                    date,
                    user_id,
                    status
                `,
            values: [dateStr, userId, status],
        };
        const rows: IOrderResponse[] = await PgDaos.queryAsync(
            this.db,
            sql,
            PgDaos.orderMapper,
        );
        if (rows.length !== 1) {
            throw new Error("Error - only 1 entry should have been created!");
        }
        return rows[0];
    }

    async getAllAsync({
        userId,
        role,
    }: IGetAllOrdersRequest): Promise<IOrderResponse[]> {
        const sql: QueryConfig = {
            text: `
                SELECT
                    id,
                    date,
                    user_id,
                    status
                FROM order_view
                ${role === "client" ? "WHERE user_id = $1" : ""}
            `,
            values: role === "client" ? [userId] : [],
        };
        return await PgDaos.queryAsync(this.db, sql, PgDaos.orderMapper);
    }

    async getAsync({ id }: IGetOrderRequest): Promise<IOrderResponse | null> {
        const sql: QueryConfig = {
            text: `
                SELECT
                    id,
                    date,
                    user_id,
                    status
                FROM order_view
                WHERE id = $1
            `,
            values: [id],
        };
        const rows: IOrderResponse[] = await PgDaos.queryAsync(
            this.db,
            sql,
            PgDaos.orderMapper,
        );
        backendLogger.debug("# of matching entries: ", rows.length);
        return rows.length > 0 ? rows[0] : null;
    }

    async updateAsync({
        // todo: Make everything except userId and role and id optional
        dateStr,
        status,
        userId,
        role,
        id,
    }: IUpdateOrderRequest): Promise<IOrderResponse | null> {
        const processed = {
            dateStr: dateStr ?? null,
            status: status ?? null,
        };

        const sql: QueryConfig = {
            text: `
                UPDATE orders SET
                    date = COALESCE($1, date),
                    status = COALESCE($2, status)
                WHERE
                    id = $3
                    ${role === "client" ? "AND user_id = $4" : ""}
                RETURNING
                    id,
                    date,
                    user_id,
                    status
            `,
            values:
                role === "client"
                    ? [processed.dateStr, processed.status, id, userId]
                    : [processed.dateStr, processed.status, id],
        };
        const rows: IOrderResponse[] = await PgDaos.queryAsync(
            this.db,
            sql,
            PgDaos.orderMapper,
        );
        if (rows.length > 1) {
            throw Error("Error - only 1 entry should have been updated");
        }
        return rows.length === 1 ? rows[0] : null;
    }

    async deleteAsync(
        _dto: IDeleteOrderRequest,
    ): Promise<IOrderResponse | null> {
        throw new Error("Method not implemented.");
    }

    async getAllPendingOrdersAsync({
        userId,
        role,
    }: IGetAllPendingOrdersRequest): Promise<IOrderResponse[]> {
        const sql: QueryConfig = {
            text: `
                SELECT
                    id,
                    date,
                    user_id,
                    status
                FROM order_view
                WHERE
                    status = 'pending'
                    ${role === "client" ? "AND user_id = $1" : ""}
            `,
            values: role === "client" ? [userId] : [],
        };
        return await PgDaos.queryAsync(this.db, sql, PgDaos.orderMapper);
    }

    async updatePendingOrderAsync({
        dateStr,
        status,
        userId,
    }: IUpdatePendingOrderRequest): Promise<IOrderResponse | null> {
        const processed = {
            dateStr: dateStr ?? null,
            status: status ?? null,
        };
        const sql: QueryConfig = {
            text: `
                UPDATE orders SET
                    date = COALESCE($1, date),
                    status = COALESCE($2, status)
                WHERE
                    user_id = $3
                    AND status = 'pending' 
                RETURNING
                    id,
                    date,
                    user_id,
                    status
            `,
            values: [processed.dateStr, processed.status, userId],
        };
        const rows: IOrderResponse[] = await PgDaos.queryAsync(
            this.db,
            sql,
            PgDaos.orderMapper,
        );
        if (rows.length > 1) {
            throw Error("Error - only 1 entry should have been updated");
        }
        return rows.length === 1 ? rows[0] : null;
    }
}

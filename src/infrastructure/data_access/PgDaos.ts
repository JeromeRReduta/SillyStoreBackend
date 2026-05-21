import { Client, Pool, QueryConfig } from "pg";
import {
    ICartItemResponse,
    ICartItemResponseWithCreator,
} from "../../../SillyStoreCommon/dtos/cartItemDtos.ts";
import { IOrderResponse } from "../../../SillyStoreCommon/dtos/orderDtos.ts";
import { IProductResponse } from "../../../SillyStoreCommon/dtos/productDtos.ts";
import {
    IUserResponse,
    IUserWithPwHashResponse,
} from "../../../SillyStoreCommon/dtos/userDtos.ts";
import backendLogger from "../../configs/BackendLogger.ts";
import { IPgCartItem } from "../psql/entities/IPgCartItem.ts";
import { IPgOrder } from "../psql/entities/IPgOrder.ts";
import { IPgProduct } from "../psql/entities/IPgProduct.ts";
import { IPgUser } from "../psql/entities/IPgUser.ts";

/** Util class for daos using PG's Client or Pool */

function userMapper({ id, username, email, role }: IPgUser): IUserResponse {
    return { id, username, email, role };
}

function userWithPwHashMapper(pgUser: IPgUser): IUserWithPwHashResponse {
    return { ...userMapper(pgUser), pwHash: pgUser.pw_hash };
}

function orderMapper({ id, date, user_id, status }: IPgOrder): IOrderResponse {
    return { id, dateStr: date, userId: user_id, status };
}

function productMapper({
    id,
    image_src,
    title,
    description,
    price,
}: IPgProduct): IProductResponse {
    return { id, imageSrc: image_src, title, description, price };
}

function cartItemMapper({
    creator_id,
    order_id,
    product_id,
    description,
    image_src,
    price,
    quantity,
    title,
}: IPgCartItem): ICartItemResponse {
    return {
        creatorId: creator_id,
        orderId: order_id,
        productId: product_id,
        description,
        imageSrc: image_src,
        price,
        quantity,
        title,
    };
}

function cartItemWithCreatorMapper({
    creator_id,
    order_id,
    product_id,
    description,
    image_src,
    price,
    quantity,
    title,
}: Required<IPgCartItem>): ICartItemResponseWithCreator {
    return {
        creatorId: creator_id,
        orderId: order_id,
        productId: product_id,
        description,
        imageSrc: image_src,
        price,
        quantity,
        title,
    };
}

async function queryAsync<TPgEntity, TResponse>(
    db: Client | Pool,
    sql: QueryConfig,
    dataMapper: IPgDataMapper<TPgEntity, TResponse>,
): Promise<TResponse[]> {
    backendLogger.debug("sql: ", sql);
    const { rows } = await db.query(sql);
    backendLogger.debug("result: ", rows);
    backendLogger.debug(
        "THING HERE TOO",
        (rows as TPgEntity[]).map(dataMapper),
    );
    return (rows as TPgEntity[]).map(dataMapper); // we trust db to return correct PgEntity type
}

export type IPgDataMapper<TPgEntity, TResponse> = (
    entity: TPgEntity,
) => TResponse;

export default {
    userMapper,
    userWithPwHashMapper,
    orderMapper,
    productMapper,
    cartItemMapper,
    cartItemWithCreatorMapper,
    queryAsync,
};

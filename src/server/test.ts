/* eslint-disable @typescript-eslint/no-unused-vars */
import cookieParser from "cookie-parser";
import express, { Express } from "express";
import morgan from "morgan";
import cors from "cors";
import {
    IUserResponse,
    TokenResponse,
    IGetUserByCredentialsRequest,
    ICreateUserRequest,
} from "../../SillyStoreCommon/dtos/userDtos.ts";
import HttpStatus from "../application/http/HttpStatus.ts";
import tokenOps from "../application/jwt/TokenOperations.ts";
import requireBody from "../application/middleware/RequireBody.ts";
import apiConfigs from "../configs/ApiConfigs.ts";
import {
    IOrderDao,
    IUpdatePendingOrderRequest,
} from "../infrastructure/data_access/IOrderDao.ts";
import { IProductDao } from "../infrastructure/data_access/IProductDao.ts";
import { IUserDao } from "../infrastructure/data_access/IUserDao.ts";
import PgOrderDao from "../infrastructure/psql/data_access/PgOrderDao.ts";
import PgProductDao from "../infrastructure/psql/data_access/PgProductDao.ts";
import PgUserDao from "../infrastructure/psql/data_access/PgUserDao.ts";
import backendConfigs from "../configs/BackendConfigs.ts";
import backendLogger from "../configs/BackendLogger.ts";
import UserClientService from "../application/services/UserClientService.ts";
import {
    IGetAllProductsRequest,
    IGetProductRequest,
    IProductResponse,
} from "../../SillyStoreCommon/dtos/productDtos.ts";
import ProductClientService from "../application/services/ProductClientService.ts";
import requireSignedIn from "../application/middleware/RequireSignedIn.ts";
import {
    ICreateOrderRequest,
    IGetAllOrdersRequest,
    IGetAllPendingOrdersRequest,
    IGetOrderRequest,
    IOrderResponse,
    IUpdateOrderRequest,
} from "../../SillyStoreCommon/dtos/orderDtos.ts";
import HttpError from "../errors/HttpError.ts";
import processToken from "../application/middleware/ProcessToken.ts";
import { ICartItemDao } from "../infrastructure/data_access/ICartItemDao.ts";
import PgCartItemDao from "../infrastructure/psql/data_access/PgCartItemDao.ts";
import {
    ICartItemResponse,
    ICreateCartItemRequest,
    IGetAllCartItemsRequest,
    IGetCartItemsInOrderRequest,
    IGetPendingCartItemsRequest,
    IMergePendingCartItemsRequest,
} from "../../SillyStoreCommon/dtos/cartItemDtos.ts";
import { ICartItem } from "../../SillyStoreCommon/domain-objects/CartItem.ts";

const app = express();
app.use(
    express.json(),
    morgan("dev"),
    cookieParser(),
    cors({
        origin: ["http://localhost:3000"],
        credentials: true,
    }),
);
const { db } = apiConfigs;

interface ITestDaos {
    readonly orders?: IOrderDao;
    readonly products?: IProductDao;
    readonly users?: IUserDao;
    readonly cartItems?: ICartItemDao;
}

const testDaos: ITestDaos = {
    products: new PgProductDao(db),
    users: new PgUserDao(db),
    orders: new PgOrderDao(db),
    cartItems: new PgCartItemDao(db),
};

const testServices = {
    users: new UserClientService(testDaos.users!),
    products: new ProductClientService(testDaos.products!),
};
app.use(processToken);
setUpViewRoutes(app);
setupUserRoutes(app);
setupProductRoutes(app);
setupOrderRoutes(app);
setupCartItemRoutes(app);
initApp(app);

function setupUserRoutes(app: Express): void {
    app.route("/users/register").post(
        requireBody(["username", "email", "pw"]),
        async (req, res, next) => {
            const dto: ICreateUserRequest = req.body;
            // const user: IUserResponse = await testDaos.users!.createAsync(req.body);
            // const token: TokenResponse = tokenOps.create({ id: user.id });
            const token: TokenResponse =
                await testServices.users.registerAsync(dto);
            res.cookie("token", token);
            res.status(HttpStatus.CREATED).send(token);
        },
    );

    app.route("/users/login").post(
        requireBody(["email", "pw"]),
        async (req, res, next) => {
            const dto: IGetUserByCredentialsRequest = req.body;
            // const user: IUserResponse | null =
            //     await testDaos.users!.getByCredentialsAsync(dto);
            // const token: TokenResponse | null = user
            //     ? tokenOps.create({ id: user.id, role: user.role })
            //     : null;
            const token: TokenResponse =
                await testServices.users.loginAsync(dto);
            res.cookie("token", token);
            res.status(token ? HttpStatus.CREATED : HttpStatus.NOT_FOUND).send(
                token,
            );
        },
    );
}
function setUpViewRoutes(app: Express): void {
    app.route("/views/orders").get(async (req, res, next) => {
        const { rows } = await db.query(`SELECT * FROM order_view`);
        res.status(HttpStatus.OK).send(rows);
    });

    app.route("/views/products").get(async (req, res, next) => {
        const { rows } = await db.query(`SELECT * FROM product_view`);

        res.status(HttpStatus.OK).send(rows);
    });

    app.route("/views/users").get(async (req, res, next) => {
        const { rows } = await db.query(`SELECT * FROM user_view`);
        res.status(HttpStatus.OK).send(rows);
    });

    app.route("/views/cart-items").get(async (req, res, next) => {
        const { rows } = await db.query(`SELECT * FROM cart_item_view`);
        res.status(HttpStatus.OK).send(rows);
    });
}

function setupProductRoutes(app: Express): void {
    app.route("/products").get(async (req, res, next) => {
        const dto: IGetAllProductsRequest = {};
        // const products: IProductResponse[] =
        //     await testDaos.products!.getAllAsync(dto);
        const products: IProductResponse[] =
            await testServices.products.getAllAsync(dto);
        res.status(HttpStatus.OK).send(products);
    });

    app.route("/products/:id").get(async (req, res, next) => {
        const dto: IGetProductRequest = { id: parseInt(req.params.id) };
        // const product: IProductResponse | null =
        //     await testDaos.products!.getAsync(dto);
        const product: IProductResponse =
            await testServices.products.getAsync(dto);
        res.status(product ? HttpStatus.OK : HttpStatus.NOT_FOUND).send(
            product,
        );
    });
}

function setupOrderRoutes(app: Express): void {
    app.use(requireSignedIn);
    app.route("/orders").get(async (req, res, next) => {
        const { id: userId, role } = req.userInfo;
        const dto: IGetAllOrdersRequest = {
            userId,
            role,
        };
        const orders: IOrderResponse[] =
            await testDaos.orders!.getAllAsync(dto);
        res.status(HttpStatus.OK).send(orders);
    });

    app.route("/orders").post(
        requireBody(["dateStr", "status"]),
        async (req, res, next) => {
            const { id: userId, role } = req.userInfo;
            const { dateStr, status } = req.body; // todo - change req.userId to req.userInfo obj = {userId, role}
            const dto: ICreateOrderRequest = {
                dateStr,
                userId,
                status,
                role,
            };
            const order: IOrderResponse =
                await testDaos.orders!.createAsync(dto);
            res.status(HttpStatus.CREATED).send(order);
        },
    );

    app.route("/orders/pending").get(async (req, res, next) => {
        const { id: userId, role } = req.userInfo;
        const dto: IGetAllPendingOrdersRequest = {
            userId,
            role,
        };
        const pendingOrders: IOrderResponse[] =
            await testDaos.orders!.getAllPendingOrdersAsync(dto);
        backendLogger.debug("ROLE: ", role);
        backendLogger.debug(
            "MAXIMUM ENTRIES ALLOWED: ",
            role === "client" ? "1" : "UNLIMITED",
        );
        backendLogger.debug(
            "# of entries actually found: ",
            pendingOrders.length,
            role === "client" && pendingOrders.length > 1 ? " (uh oh)" : "",
        );
        res.status(HttpStatus.OK).send(pendingOrders);
    });

    app.route("/orders/pending").put(
        requireBody(["dateStr", "status"]),
        async (req, res, next) => {
            const { id: userId, role } = req.userInfo;

            const { dateStr, status } = req.body;
            const dto: IUpdatePendingOrderRequest = {
                dateStr,
                status,
                userId,
                role,
            };
            backendLogger.debug("HERE IN PENDING, user info", userId, role);
            const updated: IOrderResponse | null =
                await testDaos.orders!.updatePendingOrderAsync(dto);
            backendLogger.debug("ROLE: ", role);

            res.status(updated ? HttpStatus.OK : HttpStatus.NOT_FOUND).send(
                updated,
            );
        },
    ); // put

    app.route("/orders/:id").get(async (req, res, next) => {
        const { id: userId, role } = req.userInfo;

        const dto: IGetOrderRequest = {
            id: parseInt(req.params.id),
            userId,
            role,
        };
        const order: IOrderResponse | null =
            await testDaos.orders!.getAsync(dto);
        res.status(order ? HttpStatus.OK : HttpStatus.NOT_FOUND).send(order);
    });

    app.route("/orders/:id").put(
        // not sure if i wanna put this in app, I guess I can *shrug*
        requireBody(["dateStr", "status"]),
        async (req, res, next) => {
            const { id: userId, role } = req.userInfo;

            const {
                params: { id },
                body: { dateStr, status },
            } = req;

            const dto: IUpdateOrderRequest = {
                role,
                userId,
                dateStr,
                status,
                id: parseInt(id),
            };
            const updated: IOrderResponse | null =
                await testDaos.orders!.updateAsync(dto);
            res.status(updated ? HttpStatus.OK : HttpStatus.NOT_FOUND).send(
                updated,
            );
        },
    );
}

function setupCartItemRoutes(app: Express): void {
    app.use("/cart", requireSignedIn);

    app.route("/cart/pending").get(async (req, res, next) => {
        const { id: creatorId, role } = req.userInfo;
        const dto: IGetPendingCartItemsRequest = {
            creatorId,
            role,
        };
        const cartItems: ICartItemResponse[] =
            await testDaos.cartItems!.getAllPendingAsync(dto);
        res.status(HttpStatus.OK).send(cartItems);
    });
    // note - not planning to implement this

    // app.route("/cart").get(requireBody(["orderId"]), async (req, res, next) => {
    //     const {
    //         body: { orderId },
    //         userInfo: { id: creatorId, role },
    //     } = req;
    //     const dto: IGetCartItemsInOrderRequest = {
    //         orderId,
    //         creatorId,
    //         role,
    //     };
    //     const history: ICartItemResponse[] =
    //         await testDaos.cartItems!.getAllInOrderAsync(dto);
    //     res.status(HttpStatus.OK).send(history);
    // });

    // note - not planning to implement this
    // app.route("/cart").post(
    //     requireBody(["orderId", "productId", "quantity"]),
    //     async (req, res, next) => {
    //         const dto: ICreateCartItemRequest = req.body;
    //         const created: ICartItemResponse =
    //             await testDaos.cartItems!.createAsync(dto);
    //         res.status(HttpStatus.CREATED).send(created);
    //     },
    // );

    app.route("/cart/pending").put(
        requireBody(["cartItems"]),
        async (req, res, next) => {
            const {
                body: { cartItems },
                userInfo: { id: creatorId, role },
            } = req;
            const dto: IMergePendingCartItemsRequest = {
                role,
                creatorId,
                cartItems,
            };
            const beforeMerge: ICartItemResponse[] =
                await testDaos.cartItems!.getAllPendingAsync(dto);

            const updated: ICartItemResponse[] =
                await testDaos.cartItems!.mergePendingCartAsync(dto);
            const afterMerge: ICartItemResponse[] =
                await testDaos.cartItems!.getAllPendingAsync(dto);
            backendLogger.info("before: ", beforeMerge);
            backendLogger.info("after: ", afterMerge);
            res.status(HttpStatus.OK).send(updated);
        },
    );
}

const thing: Pick<ICartItem, "productId" | "quantity">[] = [
    {
        productId: 1,
        quantity: 100,
    },
    {
        productId: 2,
        quantity: 99,
    },
    {
        productId: 3,
        quantity: 98,
    },
    {
        productId: 4,
        quantity: 97,
    },
    {
        productId: 5,
        quantity: 96,
    },
];
function initApp(app: Express): void {
    app.listen(backendConfigs.db.port, async () => {
        const { db } = apiConfigs;
        backendLogger.info("Connecting to db...");
        await db.connect();
        backendLogger.info("Server is listening on port 3000...");
    });
}

import { Client, Pool } from "pg";
import { IOrderClientService } from "../application/services/IOrderClientService.ts";
import { IProductClientService } from "../application/services/IProductClientService.ts";
import { IUserClientService } from "../application/services/IUserClientService.ts";
import { ICartItemDao } from "../infrastructure/data_access/ICartItemDao.ts";
import { IOrderDao } from "../infrastructure/data_access/IOrderDao.ts";
import { IProductDao } from "../infrastructure/data_access/IProductDao.ts";
import { IUserDao } from "../infrastructure/data_access/IUserDao.ts";
import PgCartItemDao from "../infrastructure/psql/data_access/PgCartItemDao.ts";
import PgOrderDao from "../infrastructure/psql/data_access/PgOrderDao.ts";
import PgProductDao from "../infrastructure/psql/data_access/PgProductDao.ts";
import PgUserDao from "../infrastructure/psql/data_access/PgUserDao.ts";
import backendConfigs from "./BackendConfigs.ts";
import OrderClientService from "../application/services/ClientOrderService.ts";
import ProductClientService from "../application/services/ProductClientService.ts";
import UserClientService from "../application/services/UserClientService.ts";
import { ICartItemClientService } from "../application/services/ICartItemClientService.ts";
import CartItemClientService from "../application/services/CartItemClientService.ts";

export interface IApiConfigs {
    readonly db: Client | Pool;
    readonly daos: {
        readonly cartItemDao: ICartItemDao;
        readonly orderDao: IOrderDao;
        readonly productDao: IProductDao;
        readonly userDao: IUserDao;
    };
    readonly services: {
        readonly orderClientService: IOrderClientService;
        readonly productClientService: IProductClientService;
        readonly userClientService: IUserClientService;
        readonly cartItemClientService: ICartItemClientService;
    };
}

const db: Client | Pool = new Client({
    connectionString: backendConfigs.db.databaseUrl,
});
const daos = {
    cartItemDao: new PgCartItemDao(db),
    orderDao: new PgOrderDao(db),
    productDao: new PgProductDao(db),
    userDao: new PgUserDao(db),
};
const services = {
    orderClientService: new OrderClientService(daos.orderDao),
    productClientService: new ProductClientService(daos.productDao),
    userClientService: new UserClientService(daos.userDao),
    cartItemClientService: new CartItemClientService(daos.cartItemDao),
};

const apiConfigs: IApiConfigs = {
    db,
    daos,
    services,
};

export default apiConfigs;

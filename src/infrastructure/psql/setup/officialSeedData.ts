import { IProduct } from "../../../../SillyStoreCommon/domain-objects/Product.ts";
import { IUser } from "../../../../SillyStoreCommon/domain-objects/User.ts";
import { IPgProduct } from "../entities/IPgProduct.ts";
import { IPgUser } from "../entities/IPgUser.ts";

const products: Omit<IProduct, "id">[] = [
    {
        imageSrc: "",
        title: "",
        description: "",
        price: 0,
    },
];

const users: Omit<IUser, "id">[] = [,];

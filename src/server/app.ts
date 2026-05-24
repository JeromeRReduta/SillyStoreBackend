import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { requireStr } from "../../SillyStoreCommon/configs/ConfigValidation.ts";
import finalErrorHandler from "../application/middleware/FinalErrorHandler.ts";
import processToken from "../application/middleware/ProcessToken.ts";
import psqlErrorHandler from "../application/middleware/PsqlErrorHandler.ts";
import cartRouter from "../presentation/routes/cart.ts";
import orderRouter from "../presentation/routes/orders.ts";
import productRouter from "../presentation/routes/products.ts";
import userRouter from "../presentation/routes/users.ts";

const app = express();
app.use(
    express.json(),
    morgan("dev"),
    cookieParser(),
    cors({
        origin: [requireStr("origin", process.env.ORIGIN)],
        credentials: true,
    }),
);

app.use(processToken);
app.use("/products", productRouter);
app.use("/users", userRouter);
app.use("/orders", orderRouter);
app.use("/cart", cartRouter);
/** Just gonna add these 2 error handlers from assignments */
app.use(psqlErrorHandler, finalErrorHandler);

export default app;

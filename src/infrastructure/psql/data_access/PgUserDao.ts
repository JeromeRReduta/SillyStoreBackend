/* eslint-disable @typescript-eslint/no-unused-vars */
import { Client, Pool, QueryConfig } from "pg";
import * as bcrypt from "bcrypt";
import {
    ICreateUserRequest,
    IUserResponse,
    IGetUserRequest,
    IUpdateUserRequest,
    IDeleteUserRequest,
    IGetUserByCredentialsRequest,
} from "../../../../SillyStoreCommon/dtos/userDtos.ts";
import backendLogger from "../../../configs/BackendLogger.ts";
import { IUserDao } from "../../data_access/IUserDao.ts";
import PgDaos from "../../data_access/PgDaos.ts";
import { IPgUser } from "../entities/IPgUser.ts";

export default class PgUserDao implements IUserDao {
    private db: Client | Pool;
    private numSaltRounds: number;

    constructor(db: Client | Pool, numSaltRounds: number = 10) {
        this.db = db;
        this.numSaltRounds = numSaltRounds;
    }

    async createAsync({
        username,
        pw,
        email,
    }: ICreateUserRequest): Promise<IUserResponse> {
        const pwHash: string = await bcrypt.hash(pw, this.numSaltRounds);
        const sql: QueryConfig = {
            text: `
                    INSERT INTO users (username, pw_hash, email)
                    VALUES ($1, $2, $3)
                    RETURNING *
                `,
            values: [username, pwHash, email],
        };
        const rows: IUserResponse[] = await PgDaos.queryAsync(
            this.db,
            sql,
            PgDaos.userMapper,
        );
        if (rows.length !== 1) {
            throw new Error("Error - only 1 entry should have been created!");
        }
        return rows[0];
    }

    async getAllAsync(_dto: object): Promise<IUserResponse[]> {
        throw new Error("Method not implemented.");
    }

    async getAsync(_dto: IGetUserRequest): Promise<IUserResponse | null> {
        throw new Error("Method not implemented.");
    }
    async updateAsync(_dto: IUpdateUserRequest): Promise<IUserResponse | null> {
        throw new Error("Method not implemented.");
    }

    async deleteAsync(_dto: IDeleteUserRequest): Promise<IUserResponse | null> {
        throw new Error("Method not implemented.");
    }

    async getByCredentialsAsync({
        pw,
        email,
    }: IGetUserByCredentialsRequest): Promise<IUserResponse | null> {
        const sql: QueryConfig = {
            text: `
                    SELECT
                        id,
                        username,
                        email,
                        pw_hash,
                        role
                    FROM user_view
                    WHERE email = $1
                `,
            values: [email],
        };
        backendLogger.debug("sql: ", sql);
        const { rows } = await this.db.query(sql);
        backendLogger.debug("result: ", rows);
        if (rows.length > 1) {
            throw new Error("error - should only find 0 or 1 users");
        }
        if (rows.length === 0) {
            return null;
        }
        const found: IPgUser = rows[0];
        const hasMatchingPassword: boolean = await bcrypt.compare(
            pw,
            found.pw_hash,
        );
        return hasMatchingPassword ? PgDaos.userMapper(found) : null;
    }
}

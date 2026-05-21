import jwt from "jsonwebtoken";
import backendConfigs from "../../configs/BackendConfigs.ts";
import {
    IUserResponse,
    TokenResponse,
} from "../../../SillyStoreCommon/dtos/userDtos.ts";
import { UserRole } from "../../../SillyStoreCommon/domain-objects/User.ts";
import backendLogger from "../../configs/BackendLogger.ts";

const SECRET: jwt.Secret = backendConfigs.jwt.secret;

/**
 * From FullStack Academy assignment
 */
export default class tokenOps {
    static create(payload: string | object | Buffer<ArrayBufferLike>) {
        return jwt.sign(payload, SECRET, { expiresIn: "7d" });
    }

    static verify(token: TokenResponse): jwt.JwtPayload | string {
        return jwt.verify(token, SECRET);
    }

    static createUserToken(user: IUserResponse) {
        return tokenOps.create({ id: user.id, role: user.role });
    }

    static extractUserInfo(token: TokenResponse): {
        id: number;
        role: UserRole;
    } {
        return tokenOps.verify(token) as { id: number; role: UserRole };
    }
}

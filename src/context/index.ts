import { verifyAccessToken } from "../utils/jwt";
import type { Request, Response } from "express";

export interface GQLContext {
    req: Request;
    res: Response;
    user?: any;
}

export const context = async ({ req, res }: { req: Request; res: Response }): Promise<GQLContext> => {
    const authHeader = req.headers.authorization;

    if (typeof authHeader === "string") {
        const token = authHeader.replace("Bearer ", "");
        try {
            const payload: any = verifyAccessToken(token);
            return { req, res, user: payload };
        } catch {
            return { req, res };
        }
    }

    return { req, res, user: null };
};

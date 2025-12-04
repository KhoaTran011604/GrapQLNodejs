import jwt from "jsonwebtoken";

export const signAccessToken = (payload: any) =>
    jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
        expiresIn: "15m"
    });

export const signRefreshToken = (payload: any) =>
    jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: "7d"
    });

export const verifyAccessToken = (token: string) =>
    jwt.verify(token, process.env.JWT_ACCESS_SECRET!);

export const verifyRefreshToken = (token: string) =>
    jwt.verify(token, process.env.JWT_REFRESH_SECRET!);

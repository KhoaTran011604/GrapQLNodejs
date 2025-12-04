import { GraphQLError } from "graphql";
import { GQLContext } from "../context";

export const requireAuth = (ctx: GQLContext) => {
    if (!ctx.user) {
        throw new GraphQLError("Unauthorized", {
            extensions: {
                code: "UNAUTHENTICATED",
                http: { status: 401 }
            }
        });
    }
    return ctx.user;
};

import { shield, rule, allow, deny, and, or, not } from "graphql-shield";
import { GQLContext } from "../context";
import { Role } from "../enum";

// ============================================
// RULES - Định nghĩa các quy tắc authorization
// ============================================

/**
 * Rule: isAuthenticated
 * Kiểm tra user đã đăng nhập chưa (có token hợp lệ không)
 * - cache: "contextual" - cache theo context, tối ưu performance
 */
const isAuthenticated = rule({ cache: "contextual" })(
    async (_parent, _args, ctx: GQLContext, _info) => {
        return ctx.user !== null && ctx.user !== undefined;
    }
);

/**
 * Rule: isAdmin (ví dụ mở rộng)
 * Kiểm tra user có quyền admin không
 * Bạn có thể thêm field "role" vào Customer model để sử dụng rule này
 */
const isAdmin = rule({ cache: "contextual" })(
    async (_parent, _args, ctx: GQLContext, _info) => {
        // Ví dụ: kiểm tra role từ JWT payload
        return ctx.user?.role === Role.ADMIN;
    }
);

/**
 * Rule: isOwner (ví dụ mở rộng)
 * Kiểm tra user có phải chủ sở hữu resource không
 * Dùng cho các operation như update/delete profile của chính mình
 */
const isOwner = rule({ cache: "strict" })(
    async (_parent, args, ctx: GQLContext, _info) => {
        // Kiểm tra xem user đang thao tác với chính tài khoản của mình
        return ctx.user?.userId === args.id;
    }
);

// ============================================
// PERMISSIONS - Áp dụng rules vào schema
// ============================================

/**
 * Shield configuration:
 * - allowExternalErrors: true - Cho phép throw error tùy chỉnh từ resolver
 * - fallbackRule: deny - Mặc định chặn tất cả nếu không có rule cụ thể
 * - fallbackError: Custom error message khi bị chặn
 */
export const permissions = shield(
    {
        Query: {
            // Public queries - ai cũng truy cập được
            products: allow,
            product: allow,
            categories: allow,
            category: allow,
            me: allow, // Trả về null nếu chưa đăng nhập

            // Protected queries - cần đăng nhập
            users: isAuthenticated,
            user: isAuthenticated,
            orders: allow,
            order: isAuthenticated,
            customers: isAuthenticated,
            customer: isAuthenticated,
        },

        Mutation: {
            // Public mutations - ai cũng dùng được (authentication)
            register: allow,
            login: allow,
            refresh: allow,
            logout: allow,

            // Protected mutations - cần đăng nhập
            // User operations
            createUser: isAuthenticated,
            updateUser: isAuthenticated,
            deleteUser: isAuthenticated,

            // Product operations
            createProduct: isAuthenticated,
            updateProduct: isAuthenticated,
            deleteProduct: isAuthenticated,

            // Order operations
            createOrder: isAuthenticated,
            updateOrderStatus: isAuthenticated,
            deleteOrder: isAuthenticated,

            // Category operations
            createCategory: isAuthenticated,
            updateCategory: isAuthenticated,
            deleteCategory: isAuthenticated,

            // Customer operations
            createCustomer: isAuthenticated,
            updateCustomer: isAuthenticated,
            deleteCustomer: isAuthenticated,
        },

        // Cho phép truy cập các fields trong return types
        // Nếu không có, fallbackRule: deny sẽ block các fields này
        AuthPayload: allow,
        RefreshPayload: allow,
        User: allow,
        // Product - phải định nghĩa TẤT CẢ fields khi dùng field-level
        Product: allow,
        Order: {
            id: allow,
            user: allow,
            product: allow,
            quantity: allow,
            status: allow,
            createdAt: allow,
            // totalPrice: không dùng shield rule, sẽ xử lý trong field resolver
            totalPrice: isAdmin,
        },
        Category: allow,
        Customer: allow,
    },
    {
        // Cho phép error từ resolver đi qua (không bị shield bắt)
        allowExternalErrors: true,

        // Mặc định deny tất cả nếu không định nghĩa rule
        fallbackRule: deny,

        // Custom error khi bị deny
        fallbackError: "Not authorized to access this resource",
    }
);

// ============================================
// EXPORT RULES (để dùng trong các file khác nếu cần)
// ============================================
export const rules = {
    isAuthenticated,
    isAdmin,
    isOwner,
};

// ============================================
// VÍ DỤ SỬ DỤNG NÂNG CAO
// ============================================

/*
const canEditProduct = and(isAuthenticated, isAdmin);

const canViewOrder = or(isAdmin, isOwner);


const isGuest = not(isAuthenticated);

const isValidInput = rule()(async (_parent, args, _ctx, _info) => {
    return args.input.name && args.input.name.length >= 3;
});

const rateLimit = rule({ cache: "no_cache" })(async (_parent, _args, ctx, _info) => {
    return true;
});



const isAuthenticated = rule({ cache: "contextual" })(
    async (_parent, _args, ctx, _info) => {
        return ctx.user !== null;
    }
);

const isAdmin = rule({ cache: "contextual" })(
    async (_parent, _args, ctx, _info) => {
        return ctx.user?.role === "admin";
    }
);

const isModerator = rule({ cache: "contextual" })(
    async (_parent, _args, ctx, _info) => {
        return ctx.user?.role === "moderator";
    }
);

const isSeller = rule({ cache: "contextual" })(
    async (_parent, _args, ctx, _info) => {
        return ctx.user?.role === "seller";
    }
);

const isOwner = rule({ cache: "strict" })(
    async (_parent, args, ctx, _info) => {
        return ctx.user?.userId === args.id;
    }
);


const isAdminOrMod = or(isAdmin, isModerator);


const canEditUser = and(isAuthenticated, or(isAdmin, isOwner));


const canManageProduct = or(isAdmin, isSeller);

const permissions = shield({
    User: {
        email: isAdmin, // Chỉ admin mới thấy email
        password: deny,  // Không ai được xem password
    }
});
*/

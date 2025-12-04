import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';
import Category from '../models/Category';
import Customer from '../models/Customer';
import { GQLContext } from '../context';
import bcrypt from "bcrypt";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../utils/jwt";
import { requireAuth } from "../utils/auth";

const COOKIE_NAME = "refreshToken";
export const resolvers = {
  Query: {
    me: async (_: any, __: any, ctx: GQLContext) => {
      if (!ctx.user) return null;
      return await Customer.findById(ctx.user.userId);
    },


    users: async (_: any, __: any, ctx: GQLContext) => {
      requireAuth(ctx);
      return await User.find();
    },
    user: async (_: any, { id }: { id: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      return await User.findById(id);
    },
    products: async () => {
      return await Product.find();
    },
    product: async (_: any, { id }: { id: string }) => {
      return await Product.findById(id);
    },
    orders: async (_: any, __: any, ctx: GQLContext) => {
      requireAuth(ctx);
      return await Order.find().populate('userId').populate('productId');
    },
    order: async (_: any, { id }: { id: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      return await Order.findById(id).populate('userId').populate('productId');
    },
    categories: async () => {
      return await Category.find();
    },
    category: async (_: any, { id }: { id: string }) => {
      return await Category.findById(id)
    },
    customers: async (_: any, __: any, ctx: GQLContext) => {
      requireAuth(ctx);
      return await Customer.find();
    },
    customer: async (_: any, { id }: { id: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      return await Customer.findById(id)
    }

  },

  Mutation: {
    register: async (_: any, args: any) => {
      const { name, email, password, phone } = args;

      const exists = await Customer.findOne({ email });
      if (exists) throw new Error("Email already exists");

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await Customer.create({
        name,
        email,
        phone,
        passwordHash
      });

      return user;
    },

    login: async (_: any, args: any, ctx: GQLContext) => {
      const { email, password } = args;

      const user = await Customer.findOne({ email });
      if (!user) throw new Error("Invalid credentials");

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) throw new Error("Invalid credentials");

      const payload = { userId: user._id, email: user.email };

      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      // Lưu refresh token vào DB
      user.refreshTokens = refreshToken;
      await user.save();

      // Gửi refresh token qua cookie HttpOnly
      ctx.res.cookie(COOKIE_NAME, refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return {
        accessToken,
        user
      };
    },

    refresh: async (_: any, __: any, ctx: GQLContext) => {
      const token = ctx.req.cookies[COOKIE_NAME];
      if (!token) throw new Error("Missing refresh token");

      let payload: any;
      try {
        payload = verifyRefreshToken(token);
      } catch {
        throw new Error("Invalid refresh token");
      }

      const user = await Customer.findById(payload.userId);
      if (!user) throw new Error("User not found");

      if (!user.refreshTokens)
        throw new Error("Refresh token revoked");

      // Tạo access token mới
      const newAccessToken = signAccessToken({
        userId: user._id,
        email: user.email
      });

      // rotate refresh token
      const newRefreshToken = signRefreshToken({
        userId: user._id,
        email: user.email
      });

      user.refreshTokens = newRefreshToken;
      await user.save();

      ctx.res.cookie(COOKIE_NAME, newRefreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return {
        accessToken: newAccessToken
      };
    },

    logout: async (_: any, __: any, ctx: GQLContext) => {
      const token = ctx.req.cookies[COOKIE_NAME];
      if (!token) return true;

      try {
        const payload: any = verifyRefreshToken(token);
        const user = await Customer.findById(payload.userId);
        if (user) {
          user.refreshTokens = null;
          await user.save();
        }
      } catch { }

      ctx.res.clearCookie(COOKIE_NAME);
      return true;
    }
    ,
    createUser: async (_: any, { name, email, password }: { name: string; email: string; password: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      const user = new User({ name, email, password });
      return await user.save();
    },
    updateUser: async (_: any, { id, name, email }: { id: string; name?: string; email?: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      return await User.findByIdAndUpdate(id, { name, email }, { new: true });
    },
    deleteUser: async (_: any, { id }: { id: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      const result = await User.findByIdAndDelete(id);
      return !!result;
    },

    createProduct: async (_: any, { name, description, price, stock }: { name: string; description: string; price: number; stock: number }, ctx: GQLContext) => {
      requireAuth(ctx);
      const product = new Product({ name, description, price, stock });
      return await product.save();
    },
    updateProduct: async (_: any, { id, name, description, price, stock }: { id: string; name?: string; description?: string; price?: number; stock?: number }, ctx: GQLContext) => {
      requireAuth(ctx);
      return await Product.findByIdAndUpdate(id, { name, description, price, stock }, { new: true });
    },
    deleteProduct: async (_: any, { id }: { id: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      const result = await Product.findByIdAndDelete(id);
      return !!result;
    },

    createOrder: async (_: any, { userId, productId, quantity }: { userId: string; productId: string; quantity: number }, ctx: GQLContext) => {
      requireAuth(ctx);
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }
      const totalPrice = product.price * quantity;
      const order = new Order({ userId, productId, quantity, totalPrice });
      return await order.save();
    },
    updateOrderStatus: async (_: any, { id, status }: { id: string; status: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      return await Order.findByIdAndUpdate(id, { status }, { new: true });
    },
    deleteOrder: async (_: any, { id }: { id: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      const result = await Order.findByIdAndDelete(id);
      return !!result;
    },

    createCategory: async (_: any, request: { name: string, description: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      const query = new Category(request)
      return await query.save()
    },
    updateCategory: async (_: any, request: { id: string, name: string, description: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      return await Category.findByIdAndUpdate(request.id, request, { new: true });
    },
    deleteCategory: async (_: any, { id }: { id: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      const result = await Category.findByIdAndDelete(id);
      return !!result
    },

    createCustomer: async (_: any, request: { name: string, age: number, gender: string, phone: string, address: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      const query = new Customer(request)
      return await query.save()
    },
    updateCustomer: async (_: any, request: { id: string, name: string, age: number, gender: string, phone: string, address: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      return await Customer.findByIdAndUpdate(request.id, request, { new: true })
    },
    deleteCustomer: async (_: any, { id }: { id: string }, ctx: GQLContext) => {
      requireAuth(ctx);
      const result = await Customer.findByIdAndDelete(id)
      return !!result
    }

  },

  Order: {
    user: async (parent: any) => {
      return await User.findById(parent.userId);
    },
    product: async (parent: any) => {
      return await Product.findById(parent.productId);
    },
  },
};

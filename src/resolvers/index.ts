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
import {
  ValidationError,
  NotFoundError,
  DatabaseError,
  AuthenticationError
} from '../utils/errors';
// requireAuth đã được thay thế bởi GraphQL Shield
// Authorization được xử lý trong src/permissions/index.ts

const COOKIE_NAME = "refreshToken";
export const resolvers = {
  Query: {
    me: async (_: any, __: any, ctx: GQLContext) => {
      if (!ctx.user) return null;
      return await Customer.findById(ctx.user.userId);
    },


    users: async () => {
      return await User.find();
    },
    user: async (_: any, { id }: { id: string }) => {
      return await User.findById(id);
    },
    products: async () => {
      return await Product.find();
    },
    product: async (_: any, { id }: { id: string }) => {
      try {
        if (!id) {
          throw new ValidationError("ID sản phẩm không được để trống");
        }

        const product = await Product.findById(id);

        if (!product) {
          throw new NotFoundError(`Không tìm thấy sản phẩm với ID: ${id}`);
        }

        return product;
      } catch (error) {
        // Custom errors
        if (error instanceof ValidationError || error instanceof NotFoundError) {
          throw error;
        }

        // CastError (invalid ObjectId format)
        if ((error as any).name === 'CastError') {
          throw new ValidationError("ID sản phẩm không đúng định dạng");
        }

        // Database errors
        throw new DatabaseError("Lỗi khi truy vấn sản phẩm", error);
      }
    },
    orders: async () => {
      return await Order.find().populate('userId').populate('productId');
    },
    order: async (_: any, { id }: { id: string }) => {
      return await Order.findById(id).populate('userId').populate('productId');
    },
    categories: async () => {
      return await Category.find();
    },
    category: async (_: any, { id }: { id: string }) => {
      return await Category.findById(id)
    },
    customers: async () => {
      return await Customer.find();
    },
    customer: async (_: any, { id }: { id: string }) => {
      return await Customer.findById(id)
    }

  },

  Mutation: {
    register: async (_: any, args: any) => {
      const { name, email, password, phone } = args;

      try {
        // Validate inputs
        if (!email || !password) {
          throw new ValidationError("Email và mật khẩu không được để trống");
        }

        // Kiểm tra email đã tồn tại
        const exists = await Customer.findOne({ email });
        if (exists) {
          throw new ValidationError("Email đã được sử dụng");
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await Customer.create({
          name,
          email,
          phone,
          passwordHash
        });

        return user;
      } catch (error) {
        // Nếu là custom error thì throw lại
        if (error instanceof ValidationError) {
          throw error;
        }

        // Xử lý lỗi MongoDB duplicate key
        if ((error as any).code === 11000) {
          throw new ValidationError("Email đã được sử dụng");
        }

        // Các lỗi khác
        throw new DatabaseError("Lỗi khi đăng ký tài khoản", error);
      }
    },

    login: async (_: any, args: any, ctx: GQLContext) => {
      const { email, password } = args;

      try {
        // Validate input
        if (!email || !password) {
          throw new ValidationError("Email và mật khẩu không được để trống");
        }

        const user = await Customer.findOne({ email });
        if (!user) {
          throw new AuthenticationError("Email hoặc mật khẩu không đúng");
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          throw new AuthenticationError("Email hoặc mật khẩu không đúng");
        }

        const payload = { userId: user._id, email: user.email, role: user.role, };

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
      } catch (error) {
        // Nếu là custom error thì throw lại
        if (error instanceof ValidationError || error instanceof AuthenticationError) {
          throw error;
        }

        // Các lỗi khác
        throw new DatabaseError("Lỗi khi đăng nhập", error);
      }
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
    createUser: async (_: any, { name, email, password }: { name: string; email: string; password: string }) => {
      const user = new User({ name, email, password });
      return await user.save();
    },
    updateUser: async (_: any, { id, name, email }: { id: string; name?: string; email?: string }) => {
      return await User.findByIdAndUpdate(id, { name, email }, { new: true });
    },
    deleteUser: async (_: any, { id }: { id: string }) => {
      const result = await User.findByIdAndDelete(id);
      return !!result;
    },

    createProduct: async (_: any, { name, description, price, stock }: { name: string; description: string; price: number; stock: number }) => {
      const product = new Product({ name, description, price, stock });
      return await product.save();
    },
    updateProduct: async (_: any, { id, name, description, price, stock }: { id: string; name?: string; description?: string; price?: number; stock?: number }) => {
      return await Product.findByIdAndUpdate(id, { name, description, price, stock }, { new: true });
    },
    deleteProduct: async (_: any, { id }: { id: string }) => {
      const result = await Product.findByIdAndDelete(id);
      return !!result;
    },

    createOrder: async (_: any, { userId, productId, quantity }: { userId: string; productId: string; quantity: number }) => {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }
      const totalPrice = product.price * quantity;
      const order = new Order({ userId, productId, quantity, totalPrice });
      return await order.save();
    },
    updateOrderStatus: async (_: any, { id, status }: { id: string; status: string }) => {
      return await Order.findByIdAndUpdate(id, { status }, { new: true });
    },
    deleteOrder: async (_: any, { id }: { id: string }) => {
      const result = await Order.findByIdAndDelete(id);
      return !!result;
    },

    createCategory: async (_: any, request: { name: string, description: string }) => {
      const query = new Category(request)
      return await query.save()
    },
    updateCategory: async (_: any, request: { id: string, name: string, description: string }) => {
      return await Category.findByIdAndUpdate(request.id, request, { new: true });
    },
    deleteCategory: async (_: any, { id }: { id: string }) => {
      const result = await Category.findByIdAndDelete(id);
      return !!result
    },

    createCustomer: async (_: any, request: { name: string, age: number, gender: string, phone: string, address: string }) => {
      const query = new Customer(request)
      return await query.save()
    },
    updateCustomer: async (_: any, request: { id: string, name: string, age: number, gender: string, phone: string, address: string }) => {
      return await Customer.findByIdAndUpdate(request.id, request, { new: true })
    },
    deleteCustomer: async (_: any, { id }: { id: string }) => {
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

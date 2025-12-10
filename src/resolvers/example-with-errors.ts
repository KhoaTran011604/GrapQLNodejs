/**
 * VÍ DỤ: Cách sử dụng custom error handling trong resolvers
 *
 * File này demo các cách xử lý lỗi khi truy vấn MongoDB và trả về message tùy chỉnh
 */

import Product from '../models/Product';
import User from '../models/User';
import {
  ValidationError,
  NotFoundError,
  DatabaseError,
  AuthenticationError
} from '../utils/errors';
import { GQLContext } from '../context';

// ====================
// CÁCH 1: Sử dụng Custom Error Classes (RECOMMENDED)
// ====================

export const exampleResolversWithCustomErrors = {
  Query: {
    // Ví dụ: Query product với error handling
    getProductById: async (_: any, { id }: { id: string }) => {
      try {
        // Validate input
        if (!id || id.trim() === '') {
          throw new ValidationError('ID sản phẩm không được để trống');
        }

        // Tìm product
        const product = await Product.findById(id);

        // Kiểm tra không tìm thấy
        if (!product) {
          throw new NotFoundError(`Không tìm thấy sản phẩm với ID: ${id}`);
        }

        return product;
      } catch (error) {
        // Nếu là custom error thì throw trực tiếp
        if (error instanceof ValidationError || error instanceof NotFoundError) {
          throw error;
        }

        // Nếu là MongoDB CastError (ID không đúng định dạng)
        if ((error as any).name === 'CastError') {
          throw new ValidationError('ID sản phẩm không đúng định dạng');
        }

        // Các lỗi khác từ database
        throw new DatabaseError('Lỗi khi truy vấn sản phẩm', error);
      }
    },

    // Ví dụ: Query với authentication check
    getMyProfile: async (_: any, __: any, ctx: GQLContext) => {
      if (!ctx.user) {
        throw new AuthenticationError('Bạn cần đăng nhập để xem thông tin cá nhân');
      }

      try {
        const user = await User.findById(ctx.user.userId);
        if (!user) {
          throw new NotFoundError('Không tìm thấy thông tin người dùng');
        }
        return user;
      } catch (error) {
        if (error instanceof NotFoundError) {
          throw error;
        }
        throw new DatabaseError('Lỗi khi lấy thông tin người dùng', error);
      }
    }
  },

  Mutation: {
    // Ví dụ: Create product với validation
    createProductWithValidation: async (_: any, args: any) => {
      const { name, description, price, stock } = args;

      try {
        // Validate inputs
        if (!name || name.trim() === '') {
          throw new ValidationError('Tên sản phẩm không được để trống');
        }

        if (price < 0) {
          throw new ValidationError('Giá sản phẩm phải lớn hơn hoặc bằng 0');
        }

        if (stock < 0) {
          throw new ValidationError('Số lượng tồn kho phải lớn hơn hoặc bằng 0');
        }

        // Kiểm tra duplicate name
        const existingProduct = await Product.findOne({ name });
        if (existingProduct) {
          throw new ValidationError(`Sản phẩm với tên "${name}" đã tồn tại`);
        }

        // Tạo product mới
        const product = new Product({ name, description, price, stock });
        return await product.save();

      } catch (error) {
        // Custom errors
        if (error instanceof ValidationError) {
          throw error;
        }

        // MongoDB duplicate key error (E11000)
        if ((error as any).code === 11000) {
          throw new ValidationError('Sản phẩm này đã tồn tại trong hệ thống');
        }

        // MongoDB validation error
        if ((error as any).name === 'ValidationError') {
          throw new ValidationError((error as any).message);
        }

        // Database errors
        throw new DatabaseError('Lỗi khi tạo sản phẩm mới', error);
      }
    },

    // Ví dụ: Update product với error handling
    updateProductWithValidation: async (_: any, args: any) => {
      const { id, name, price, stock } = args;

      try {
        // Validate ID
        if (!id) {
          throw new ValidationError('ID sản phẩm không được để trống');
        }

        // Kiểm tra product có tồn tại không
        const product = await Product.findById(id);
        if (!product) {
          throw new NotFoundError(`Không tìm thấy sản phẩm với ID: ${id}`);
        }

        // Validate giá
        if (price !== undefined && price < 0) {
          throw new ValidationError('Giá sản phẩm phải lớn hơn hoặc bằng 0');
        }

        // Validate stock
        if (stock !== undefined && stock < 0) {
          throw new ValidationError('Số lượng tồn kho phải lớn hơn hoặc bằng 0');
        }

        // Update product
        const updatedProduct = await Product.findByIdAndUpdate(
          id,
          { name, price, stock },
          { new: true, runValidators: true }
        );

        return updatedProduct;

      } catch (error) {
        // Custom errors
        if (error instanceof ValidationError || error instanceof NotFoundError) {
          throw error;
        }

        // CastError
        if ((error as any).name === 'CastError') {
          throw new ValidationError('ID sản phẩm không đúng định dạng');
        }

        // Database errors
        throw new DatabaseError('Lỗi khi cập nhật sản phẩm', error);
      }
    }
  }
};

// ====================
// CÁCH 2: Sử dụng try-catch đơn giản với Error thông thường
// ====================

export const exampleResolversWithSimpleErrors = {
  Mutation: {
    // Cách đơn giản: throw Error với message tùy chỉnh
    simpleCreateProduct: async (_: any, args: any) => {
      try {
        const { name, price } = args;

        if (!name) {
          throw new Error('Tên sản phẩm không được để trống');
        }

        const product = new Product(args);
        return await product.save();

      } catch (error) {
        // Kiểm tra lỗi duplicate key từ MongoDB
        if ((error as any).code === 11000) {
          throw new Error('Sản phẩm đã tồn tại trong hệ thống');
        }

        // Throw lại error với message tùy chỉnh
        throw new Error(`Lỗi khi tạo sản phẩm: ${(error as any).message}`);
      }
    }
  }
};

// ====================
// CÁCH 3: Tạo helper function để handle MongoDB errors
// ====================

function handleMongoError(error: any, customMessage?: string): never {
  // Duplicate key error
  if (error.code === 11000) {
    throw new ValidationError('Dữ liệu đã tồn tại trong hệ thống');
  }

  // CastError (invalid ObjectId)
  if (error.name === 'CastError') {
    throw new ValidationError('ID không hợp lệ');
  }

  // Validation error
  if (error.name === 'ValidationError') {
    throw new ValidationError(error.message);
  }

  // Generic error
  throw new DatabaseError(customMessage || 'Lỗi cơ sở dữ liệu', error);
}

export const exampleResolversWithHelper = {
  Mutation: {
    createProductWithHelper: async (_: any, args: any) => {
      try {
        const product = new Product(args);
        return await product.save();
      } catch (error) {
        handleMongoError(error, 'Lỗi khi tạo sản phẩm');
      }
    }
  }
};

/**
 * HƯỚNG DẪN SỬ DỤNG:
 *
 * 1. Trong resolvers/index.ts, import các custom errors:
 *    import { ValidationError, NotFoundError, DatabaseError } from '../utils/errors';
 *
 * 2. Wrap code trong try-catch block
 *
 * 3. Throw custom errors với message tiếng Việt:
 *    throw new ValidationError('Dữ liệu không hợp lệ');
 *    throw new NotFoundError('Không tìm thấy dữ liệu');
 *    throw new DatabaseError('Lỗi database', originalError);
 *
 * 4. Format error trong Apollo Server sẽ tự động xử lý và trả về response:
 *    {
 *      "errors": [{
 *        "message": "Dữ liệu không hợp lệ",
 *        "extensions": {
 *          "code": "BAD_USER_INPUT",
 *          "statusCode": 400,
 *          "timestamp": "2024-01-01T00:00:00.000Z"
 *        }
 *      }]
 *    }
 */

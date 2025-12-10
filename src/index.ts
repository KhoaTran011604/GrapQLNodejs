import { ApolloServer } from '@apollo/server';
import mongoose from 'mongoose';
import cookieParser from "cookie-parser";
import { expressMiddleware } from "@apollo/server/express4";
import express from "express";
import cors from "cors";
import dotenv from 'dotenv';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { applyMiddleware } from 'graphql-middleware';
import { GraphQLError } from 'graphql';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './resolvers';
import { context } from "./context";
import { permissions } from "./permissions";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/graphql-db';
const PORT = parseInt(process.env.PORT || '4000');

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const app = express();

    // Cấu hình CORS cho phép http://localhost:5173 truy cập
    app.use(cors({
      origin: 'http://localhost:5173',
      credentials: true
    }));

    app.use(express.json());
    app.use(cookieParser());

    // Bước 1: Tạo executable schema từ typeDefs và resolvers
    const executableSchema = makeExecutableSchema({ typeDefs, resolvers });

    // Bước 2: Áp dụng GraphQL Shield permissions vào schema
    const schemaWithPermissions = applyMiddleware(executableSchema, permissions);

    // Bước 3: Tạo Apollo Server với schema đã có permissions
    const server = new ApolloServer({
      schema: schemaWithPermissions,
      // Cấu hình format error để trả về message tùy chỉnh
      formatError: (formattedError, error) => {
        // Log error để debug (trong môi trường production nên dùng logger thay vì console.log)
        console.error('GraphQL Error:', {
          message: formattedError.message,
          code: formattedError.extensions?.code,
          path: formattedError.path,
          timestamp: new Date().toISOString()
        });

        // Nếu là lỗi MongoDB
        if (error instanceof Error && error.message.includes('E11000')) {
          return {
            message: 'Dữ liệu đã tồn tại trong hệ thống',
            extensions: {
              code: 'DUPLICATE_KEY_ERROR',
              statusCode: 409
            }
          };
        }

        // Nếu là lỗi validation từ mongoose
        if (error instanceof Error && error.name === 'ValidationError') {
          return {
            message: 'Dữ liệu không hợp lệ',
            extensions: {
              code: 'VALIDATION_ERROR',
              statusCode: 400,
              details: error.message
            }
          };
        }

        // Nếu là lỗi cast (ví dụ: ObjectId không hợp lệ)
        if (error instanceof Error && error.name === 'CastError') {
          return {
            message: 'ID không hợp lệ',
            extensions: {
              code: 'INVALID_ID',
              statusCode: 400
            }
          };
        }

        // Trong môi trường development, trả về chi tiết lỗi
        // Trong production, nên ẩn đi các thông tin nhạy cảm
        const isDevelopment = process.env.NODE_ENV !== 'production';

        if (!isDevelopment && formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
          return {
            message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              statusCode: 500
            }
          };
        }

        // Trả về formatted error với thông tin đầy đủ
        return {
          ...formattedError,
          extensions: {
            ...formattedError.extensions,
            timestamp: new Date().toISOString()
          }
        };
      }
    });

    await server.start();

    app.use(
      "/graphql",
      expressMiddleware(server, { context })
    );

    app.listen(PORT, () => console.log(`http://localhost:${PORT}/graphql`));
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();






import { ApolloServer } from '@apollo/server';
import mongoose from 'mongoose';
import cookieParser from "cookie-parser";
import { expressMiddleware } from "@apollo/server/express4";
import express from "express";
import dotenv from 'dotenv';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { applyMiddleware } from 'graphql-middleware';
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
    app.use(express.json());
    app.use(cookieParser());

    // Bước 1: Tạo executable schema từ typeDefs và resolvers
    const executableSchema = makeExecutableSchema({ typeDefs, resolvers });

    // Bước 2: Áp dụng GraphQL Shield permissions vào schema
    const schemaWithPermissions = applyMiddleware(executableSchema, permissions);

    // Bước 3: Tạo Apollo Server với schema đã có permissions
    const server = new ApolloServer({
      schema: schemaWithPermissions
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






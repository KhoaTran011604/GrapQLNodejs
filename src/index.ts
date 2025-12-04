import { ApolloServer } from '@apollo/server';
import mongoose from 'mongoose';
import cookieParser from "cookie-parser";
import { expressMiddleware } from "@apollo/server/express4";
import express from "express";
import dotenv from 'dotenv';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './resolvers';
import { context } from "./context";

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

    const server = new ApolloServer({
      typeDefs,
      resolvers
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






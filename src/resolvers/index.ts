import User from '../models/User';
import Product from '../models/Product';
import Order from '../models/Order';
import Category from '../models/Category';
import Customer from '../models/Customer';
import { isDataView } from 'util/types';

export const resolvers = {
  Query: {
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
      return await Product.findById(id);
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

export const typeDefs = `#graphql
  
  # Models
  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: String!
  }

  type Product {
    id: ID!
    name: String!
    description: String!
    price: Float!
    stock: Int!
    createdAt: String!
  }

  type Order {
    id: ID!
    user: User!
    product: Product!
    quantity: Int!
    totalPrice: Float!
    status: String!
    createdAt: String!
  }

  type Category {
    id: ID!
    name: String!
    description: String
  }

  type Customer {
    id: ID!
    name: String!
    age: Int!
    gender: String
    phone: String!
    address: String
  }

  # Get all, set one
  type Query {
    users: [User!]!
    user(id: ID!): User
    products: [Product!]!
    product(id: ID!): Product
    orders: [Order!]!
    order(id: ID!): Order
    categories: [Category!]!
    category(id: ID!): Category
    customers: [Customer!]!
    customer(id: ID!): Customer
  }

  # CRUD functions
  type Mutation {
    createUser(name: String!, email: String!, password: String!): User!
    updateUser(id: ID!, name: String, email: String): User
    deleteUser(id: ID!): Boolean!

    createProduct(name: String!, description: String!, price: Float!, stock: Int!): Product!
    updateProduct(id: ID!, name: String, description: String, price: Float, stock: Int): Product
    deleteProduct(id: ID!): Boolean!

    createOrder(userId: ID!, productId: ID!, quantity: Int!): Order!
    updateOrderStatus(id: ID!, status: String!): Order
    deleteOrder(id: ID!): Boolean!

    createCategory(name: String!, description: String) : Category!
    updateCategory(id: ID!, name: String!, description: String) : Category
    deleteCategory(id: ID!): Boolean!

    createCustomer(name: String!, age: Int!, gender: String, phone: String!, address: String) : Customer!
    updateCustomer(id: ID!, name: String!, age: Int!, gender: String, phone: String!, address: String) : Customer
    deleteCustomer(id: ID!): Boolean!
  }
`;

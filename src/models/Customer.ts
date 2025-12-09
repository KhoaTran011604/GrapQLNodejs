import mongoose, { Document, Schema } from "mongoose";

export interface ICustomer extends Document {
    name: string
    gender: string
    phone: string
    dob: string
    address: string
    refreshTokens: string | null
    passwordHash: string
    email: string
    role: string
}

const customerSchema = new Schema({
    name: {
        type: String,
        require
    },
    age: {
        type: Number,
        require
    },
    gender: {
        type: String
    },
    phone: {
        type: String,
        require
    },

    address: {
        type: String
    },
    passwordHash: {
        type: String
    },
    refreshTokens: {
        type: String
    }
    ,
    email: {
        type: String
    }
    ,
    role: {
        type: String,
        default: "default"
    }
})

export default mongoose.model<ICustomer>('Customer', customerSchema)
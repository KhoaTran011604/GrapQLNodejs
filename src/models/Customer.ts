import mongoose, { Document, Schema } from "mongoose";

export interface ICustomer extends Document {
    name: string
    gender: string
    phone: string
    dob: string
    address: string
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
    }
})

export default mongoose.model<ICustomer>('Customer', customerSchema)
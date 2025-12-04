import mongoose, { Document, Schema } from "mongoose";


export interface ICategory extends Document {
    name: string;
    description: string
}

const categorySchema: Schema = new Schema({
    name: {
        type: String,
        require: true
    },
    description: {
        type: String
    }
})

export default mongoose.model<ICategory>('Category', categorySchema)
import mongoose from 'mongoose'
import { User } from '../models/user.model.js'

const connectDB = async() => {
    try {
        const con_inst = await mongoose.connect(`${process.env.MONGODB_URI}/TaskMaaDB`)

        await User.init();
        console.log('Congrats... Database connected !!')
    } catch (error) {
        console.log("Oopps.. There was some error connecting to the database: ", error.message)
    }
}

export default connectDB
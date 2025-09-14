import mongoose from 'mongoose'

const connectDB = async() => {
    try {
        const con_inst = await mongoose.connect(`${process.env.MONGODB_URI}/TaskMaaDB`)
        console.log('Congrats... Database connected !!')
    } catch (error) {
        console.log("Upps.. There was some error connecting to the database: ", error.message)
    }
}

export default connectDB
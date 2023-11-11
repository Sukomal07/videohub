import mongoose from 'mongoose'

export const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'videohub'
        });
        console.log('Database connection successful');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1); // Terminate the application with an error code (1)
    }
};
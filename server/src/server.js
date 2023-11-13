import app from './app.js'
import { connectDb } from './db/db.js'
import dotenv from 'dotenv'
import { v2 as cloudinary } from 'cloudinary';


dotenv.config()
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

connectDb()
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Server is running on http://localhost:${process.env.PORT}`);
        });
    })
    .catch((err) => {
        console.log("MongoDB connection failed:", err);
    });
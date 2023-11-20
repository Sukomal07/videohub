import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'


const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))
app.use(express.json({ limit: "20kb" }))
app.use(express.urlencoded({ extended: true, limit: "20kb" }))
app.use(cookieParser())

// import routes
import userRoutes from './routes/user.routes.js'


//routes config

app.use("/api/v1/user", userRoutes)

export default app

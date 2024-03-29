import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import errorMiddleware from './middlewares/error.middleware.js'

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))
app.use(express.json({ limit: "20kb" }))
app.use(express.urlencoded({ extended: true, limit: "20kb" }))
app.use(cookieParser())

// import routes
import healthcheckRoutes from './routes/healthcheck.routes.js'
import userRoutes from './routes/user.routes.js'
import channelRoutes from './routes/channel.routes.js'
import videoRoutes from './routes/video.routes.js'
import playlistRoutes from './routes/playlist.routes.js'
import tweetRoutes from './routes/tweet.routes.js'
import searchRoutes from './routes/search.routes.js'

//routes config
app.use("/api/v1/healthcheck", healthcheckRoutes)
app.use("/api/v1/user", userRoutes)
app.use("/api/v1/channel", channelRoutes)
app.use("/api/v1/video", videoRoutes)
app.use("/api/v1/playlist", playlistRoutes)
app.use("/api/v1/tweet", tweetRoutes)
app.use("/api/v1/results", searchRoutes)

app.all("*", (req, res) => {
    res.status(404).json({
        status: 404,
        success: false,
        message: "!oops page not found"
    })
})

app.use(errorMiddleware)
export default app

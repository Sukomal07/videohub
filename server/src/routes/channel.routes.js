import express from 'express'
import { getChannelProfile } from '../controllers/channel.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { upload } from '../middlewares/multer.middleware.js'
import { uploadNewVideo } from '../controllers/video.controller.js'

const router = express.Router()

router.get('/details/:username', getChannelProfile)
router.post('/new/upload', verifyJWT, upload.fields([{ name: "videoFile", maxCount: 1 }, { name: "thumbnail", maxCount: 1 }]), uploadNewVideo)

export default router
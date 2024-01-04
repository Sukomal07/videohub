import express from 'express'
import { getChannelProfile } from '../controllers/channel.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { upload } from '../middlewares/multer.middleware.js'
import { deleteVideo, getAllVideo, getVideoById, uploadNewVideo } from '../controllers/video.controller.js'

const router = express.Router()

router.get('/details/:username', getChannelProfile)
router.post('/new/upload', verifyJWT, upload.fields([{ name: "videoFile", maxCount: 1 }, { name: "thumbnail", maxCount: 1 }]), uploadNewVideo)
router.delete('/video/delete/:videoId', verifyJWT, deleteVideo)
router.get('/videos', getAllVideo)
router.get('/video/:videoId', getVideoById)
export default router
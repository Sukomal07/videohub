import express from 'express'
import { getAllFollowings, getChannelPlaylist, getChannelProfile, getChannelStats, getChannelTweets, getChannelVideos } from '../controllers/channel.controller.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { upload } from '../middlewares/multer.middleware.js'
import { deleteVideo, getVideoById, togglePublishStatus, updateVideo, uploadNewVideo } from '../controllers/video.controller.js'

const router = express.Router()

router.get('/details/:username', getChannelProfile)
router.post('/new/upload', verifyJWT, upload.fields([{ name: "videoFile", maxCount: 1 }, { name: "thumbnail", maxCount: 1 }]), uploadNewVideo)
router.get('/videos/:videoId', getVideoById)
router.patch('/videos/:videoId', verifyJWT, upload.single("thumbnail"), updateVideo)
router.delete('/videos/delete/:videoId', verifyJWT, deleteVideo)
router.patch('/videos/:videoId/toggle', verifyJWT, togglePublishStatus)

router.get('/:username/videos', getChannelVideos)
router.get('/:username/playlists', getChannelPlaylist)
router.get('/:username/tweets', getChannelTweets)
router.get('/:username/followings', getAllFollowings)
router.get('/stats', verifyJWT, getChannelStats)

export default router
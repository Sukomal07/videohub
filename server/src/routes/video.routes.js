import express from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { commentOnVideo, deleteComment, disLikeVideo, editComment, getAllVideo, likeVideo } from '../controllers/video.controller.js'

const router = express.Router()

router.get('/all', getAllVideo)
router.post('/:videoId/like', verifyJWT, likeVideo)
router.post('/:videoId/dislike', verifyJWT, disLikeVideo)
router.post('/:videoId/comment', verifyJWT, commentOnVideo)
router.put('/:videoId/comments/:commentId', verifyJWT, editComment)
router.delete('/:videoId/comments/:commentId', verifyJWT, deleteComment)

export default router
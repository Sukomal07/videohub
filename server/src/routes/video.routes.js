import express from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { commentOnVideo, deleteComment, disLikeVideo, editComment, likeVideo } from '../controllers/video.controller.js'

const router = express.Router()

router.post('/:videoId/like', verifyJWT, likeVideo)
router.post('/:videoId/dislike', verifyJWT, disLikeVideo)
router.post('/:videoId/comment', verifyJWT, commentOnVideo)
router.put('/:videoId/comments/:commentId', verifyJWT, editComment)
router.delete('/:videoId/comments/:commentId', verifyJWT, deleteComment)

export default router
import express from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { commentOnVideo, deleteComment, disLikeVideo, editComment, getAllVideo, getVideoComments, likeVideo, toggleCommentDisLike, toggleCommentLike } from '../controllers/video.controller.js'

const router = express.Router()

router.get('/all', getAllVideo)
router.post('/:videoId/like', verifyJWT, likeVideo)
router.post('/:videoId/dislike', verifyJWT, disLikeVideo)
router.get('/:videoId/comments', verifyJWT, getVideoComments)
router.post('/:videoId/comment', verifyJWT, commentOnVideo)
router.put('/:videoId/comments/:commentId', verifyJWT, editComment)
router.delete('/:videoId/comments/:commentId', verifyJWT, deleteComment)

router.post('/:videoId/comments/:commentId/like', verifyJWT, toggleCommentLike)
router.post('/:videoId/comments/:commentId/dislike', verifyJWT, toggleCommentDisLike)

export default router
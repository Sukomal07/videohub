import express from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { createTweet, deleteTweet, toggleTweetDisLike, toggleTweetLike, updateTweet } from '../controllers/tweet.controller.js'

const router = express.Router()

router.post('/newtweet', verifyJWT, createTweet)
router.patch('/:tweetId/update', verifyJWT, updateTweet)
router.delete('/:tweetId/delete', verifyJWT, deleteTweet)
router.post('/:tweetId/like', verifyJWT, toggleTweetLike)
router.post('/:tweetId/dislike', verifyJWT, toggleTweetDisLike)

export default router
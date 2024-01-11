import express from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { toggleSubscription } from '../controllers/subscription.controller.js'

const router = express.Router()

router.post('/:channelId/subscribe', verifyJWT, toggleSubscription)

export default router
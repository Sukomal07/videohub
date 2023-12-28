import express from 'express'
import { getChannelProfile } from '../controllers/channel.controller.js'

const router = express.Router()

router.get('/details/:username', getChannelProfile)

export default router
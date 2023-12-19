import express from 'express'
import { loginUser, logoutUser, refreshAccessToken, registerUser } from '../controllers/user.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.post('/signup', upload.fields([{ name: "avatar", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]), registerUser)
router.post('/login', loginUser)
router.post('/logout', verifyJWT, logoutUser)
router.post('/refresh-token', refreshAccessToken)

export default router
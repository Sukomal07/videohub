import express from 'express'
import { changePassword, deleteAccount, getProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateImages, updateProfile } from '../controllers/user.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'

const router = express.Router()

router.post('/signup', upload.fields([{ name: "avatar", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]), registerUser)
router.post('/login', loginUser)
router.post('/logout', verifyJWT, logoutUser)
router.post('/refresh-token', refreshAccessToken)
router.patch('/change-password', verifyJWT, changePassword)
router.get('/profile', verifyJWT, getProfile)
router.patch('/update-profile', verifyJWT, updateProfile)
router.patch('/update-images', verifyJWT, upload.fields([{ name: "avatar", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]), updateImages)
router.delete('/delete-profile', verifyJWT, deleteAccount)
router.get("/watch-history", verifyJWT, getWatchHistory)
export default router
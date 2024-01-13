import express from 'express'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, removeVideoFromPlaylist, updatePlaylist } from '../controllers/playlist.controller.js'


const router = express.Router()

router.post('/create', verifyJWT, createPlaylist)
router.get('/:playlistId', getPlaylistById)
router.put('/:playlistId/:videoId/add', verifyJWT, addVideoToPlaylist)
router.delete('/:playlistId/:videoId/remove', verifyJWT, removeVideoFromPlaylist)
router.patch('/:playlistId/update', verifyJWT, updatePlaylist)
router.delete('/:playlistId/delete', verifyJWT, deletePlaylist)

export default router
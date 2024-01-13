import { Schema, model } from 'mongoose'

const playlistSchema = new Schema({
    name: {
        type: String,
        required: [true, 'name is required'],
        minLength: [3, 'Name must be at least 3 character'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'name is required'],
        minLength: [3, 'Name must be at least 3 character'],
        trim: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    videos: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
}, { timestamps: true })

const Playlist = model('Playlist', playlistSchema)

export default Playlist
import { Schema, model } from "mongoose";

const disLikeSchema = new Schema({
    comment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: 'Video'
    },
    disLikedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: 'Tweet'
    }
})

const DisLike = model('DisLike', disLikeSchema)

export default DisLike
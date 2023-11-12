import { Schema, model } from 'mongoose'
import aggregatePaginate from 'mongoose-aggregate-paginate-v2'

const videoSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        minLength: [8, 'Title must be at least 8 character'],
        maxLength: [59, 'Title should be less than 60 character'],
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        minLength: [8, 'Description must be at least 8 character'],
        lowercase: true,
        trim: true
    },
    videoFile: {
        required: [true, 'Video is required'],
        public_id: {
            type: String
        },
        secure_url: {
            type: String
        }
    },
    thumbnail: {
        required: [true, 'Thumbnail is required'],
        public_id: {
            type: String
        },
        secure_url: {
            type: String
        }
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    duration: {
        type: Number,
        required: true
    },
    views: {
        type: Number,
        default: 0
    }
}, { timestamps: true })

videoSchema.plugin(aggregatePaginate);
const Video = model("Video", videoSchema);

export default Video

import { Schema, model } from 'mongoose'
import aggregatePaginate from 'mongoose-aggregate-paginate-v2'

const tweetSchema = new Schema({
    content: {
        type: String,
        required: [true, 'content is required']
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true })

tweetSchema.plugin(aggregatePaginate)
const Tweet = model('Tweet', tweetSchema)

export default Tweet
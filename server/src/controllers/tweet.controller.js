import Tweet from '../models/tweet.model.js'
import Like from '../models/like.model.js'
import DisLike from '../models/dislike.model.js'
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

export const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body
    const userId = req.user?._id

    if (!content) {
        throw new ApiError(400, 'content is required')
    }

    const tweet = new Tweet({
        content,
        owner: userId
    })

    await tweet.save()

    res.status(200).json(
        new ApiResponse(201, tweet, 'Tweet created successfully')
    )
})

export const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const userId = req.user?._id

    const tweet = await Tweet.findByIdAndUpdate(
        { _id: tweetId, owner: userId },
        {
            $set: req.body
        },
        {
            new: true
        }
    )

    if (!tweet) {
        throw new ApiError(404, 'Tweet not found')
    }

    res.status(200).json(
        new ApiResponse(200, tweet, 'tweet updated successfully')
    )
})

export const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const userId = req.user?._id

    const tweet = await Tweet.findByIdAndDelete(
        { _id: tweetId, owner: userId }
    )

    if (!tweet) {
        throw new ApiError(404, 'tweet not found')
    }

    res.status(200).json(
        new ApiResponse(200, '', 'tweet deleted successfully')
    )
})

export const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const userId = req.user?._id;

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, 'Tweet not found');
    }

    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: userId });
    const existingDislike = await DisLike.findOne({ tweet: tweetId, disLikedBy: userId });

    if (existingLike) {
        await existingLike.deleteOne({ _id: existingLike._id })
        res.status(200).json(new ApiResponse(200, '', 'Tweet like removed'));
    } else {
        if (existingDislike) {
            await existingDislike.deleteOne({ _id: existingDislike._id });
        }
        const newLike = new Like({
            tweet: tweetId,
            likedBy: userId,
        });

        await newLike.save();

        res.status(201).json(new ApiResponse(201, newLike, 'tweet liked successfully'));
    }
})

export const toggleTweetDisLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const userId = req.user?._id;

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, 'Tweet not found');
    }

    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: userId });
    const existingDislike = await DisLike.findOne({ tweet: tweetId, disLikedBy: userId });

    if (existingDislike) {
        await existingDislike.deleteOne({ _id: existingDislike._id })
        res.status(200).json(new ApiResponse(200, '', 'Tweet dislike removed'));
    } else {
        if (existingLike) {
            await existingLike.deleteOne({ _id: existingLike._id });
        }
        const newDisLike = new DisLike({
            tweet: tweetId,
            disLikedBy: userId,
        });

        await newDisLike.save();

        res.status(201).json(new ApiResponse(201, newDisLike, 'tweet disliked successfully'));
    }
})
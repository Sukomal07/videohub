import User from "../models/user.model.js"
import Video from "../models/video.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

export const getChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username) {
        throw new ApiError(401, "username is required")
    }

    const channel = await User.aggregate([
        //match all documents with username
        {
            $match: {
                userName: username
            }
        },
        // find channels subscribers . lookup stage connect to collections
        {
            $lookup: {
                from: "subscriptions", // from which collection we want to add
                localField: "_id",  // current collection field that will help to find in collection which we want to add
                foreignField: "channel", // in from collection field , that field name match localField
                as: "subscribers" // name or result array that will add in current collection document
            }
        },
        // find user subscribed other channels
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        // add fields in user documents
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribed: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                channelSubscribed: 1,
                isSubscribed: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exist")
    }

    res.status(200).json(
        new ApiResponse(200, channel[0], "Channel fetched successfully")
    )
})

export const getChannelVideos = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
        throw new ApiError(400, 'username is required')
    }

    const channel = await User.aggregate([
        {
            $match: {
                userName: username
            }
        },
        {
            $lookup: {
                from: 'videos',
                localField: '_id',
                foreignField: 'owner',
                as: 'videos',
                pipeline: [
                    {
                        $project: {
                            title: 1,
                            thumbnail: 1,
                            videoFile: 1,
                            views: 1,
                            createdAt: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                videos: "$videos"
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, 'videos not found')
    }

    res.status(200).json(
        new ApiResponse(200, channel[0].videos, 'videos fetched successfully')
    )
})

export const getChannelPlaylist = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username) {
        throw new ApiError(400, 'username is required')
    }

    const channel = await User.aggregate([
        {
            $match: {
                userName: username
            }
        },
        {
            $lookup: {
                from: 'playlists',
                localField: '_id',
                foreignField: 'owner',
                as: 'playlists',
                pipeline: [
                    {
                        $project: {
                            name: 1,
                            description: 1,
                            videos: 1,
                            createdAt: 1
                        }
                    }
                ]
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(400, 'Playlist not found')
    }

    res.status(200).json(
        new ApiResponse(200, channel[0].playlists, 'Playlist fetched successfully')
    )
})

export const getChannelTweets = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username) {
        throw new ApiError(400, 'username is required')
    }

    const channel = await User.aggregate([
        {
            $match: {
                userName: username
            }
        },
        {
            $lookup: {
                from: 'tweets',
                localField: '_id',
                foreignField: 'owner',
                as: 'tweets',
                pipeline: [
                    {
                        $project: {
                            content: 1,
                            createdAt: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                tweets: "$tweets"
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, 'Tweets not found')
    }

    res.status(200).json(
        new ApiResponse(200, channel[0].tweets, 'Tweets fetched successfully')
    )
})

export const getAllFollowings = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username) {
        throw new ApiError(400, 'username is required')
    }

    const channel = await User.aggregate([
        {
            $match: {
                userName: username
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "followings",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "channel",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1,
                                        createdAt: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    if (!channel.length) {
        throw new ApiError(404, 'followings not found')
    }

    res.status(200).json(
        new ApiResponse(200, channel[0].followings, 'followings fetched successfully')
    )
})

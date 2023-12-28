import User from "../models/user.model.js"
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
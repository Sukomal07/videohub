import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import Video from "../models/video.model.js"
import User from "../models/user.model.js"

export const searchController = asyncHandler(async (req, res) => {
    const { search_query } = req.query;

    if (!search_query) {
        throw new ApiError(400, 'Search query is required');
    }

    const regex = new RegExp(search_query, 'i');

    const users = await User.aggregate([
        {
            $match: {
                $or: [
                    { userName: { $regex: regex } },
                    { fullName: { $regex: regex } },
                ],
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $project: {
                avatar: 1,
                fullName: 1,
                userName: 1,
                totalSubscribers: { $size: '$subscribers' },
            },
        },
    ]);

    const videos = await Video.aggregate([
        {
            $match: {
                $and: [
                    { title: { $regex: regex } },
                    { isPublished: true },
                ],
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'ownerDetails',
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            fullName: 1
                        }
                    }
                ]
            },
        },
        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                ownerDetails: 1
            }
        }
    ])

    res.status(200).json(new ApiResponse(200, { users, videos }, 'Search results fetched successfully'));
})

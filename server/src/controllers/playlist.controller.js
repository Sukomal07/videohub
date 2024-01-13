import mongoose from 'mongoose'
import JWT from 'jsonwebtoken'
import User from "../models/user.model.js"
import Playlist from '../models/playlist.model.js'
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

export const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    if (!name || !description) {
        throw new ApiError(400, 'name and description required')
    }

    const newPlaylist = new Playlist({
        name,
        description,
        owner: req.user._id,
        videos: [],
    });

    await newPlaylist.save();

    res.status(201).json(new ApiResponse(201, newPlaylist, "Playlist created successfully"));
})

export const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    const playlistDetails = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $unwind: "$owner",
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                        },
                    },
                    {
                        $addFields: {
                            ownerName: {
                                $arrayElemAt: [
                                    "$owner.fullName",
                                    0,
                                ],
                            }
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            createdAt: 1,
                            ownerName: 1,
                        }
                    },
                ],
            },
        },

        {
            $addFields: {
                createdBy: "$owner.fullName",
                totalVideos: { $size: '$videos' },
                totalViews: { $sum: '$videos.views' }
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdBy: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: 1,
            },
        },
    ]);

    if (!playlistDetails.length) {
        throw new ApiError(404, 'Playlist not found')
    }

    res.status(200).json(new ApiResponse(200, playlistDetails[0], 'Playlist details fetched successfully'));
})

export const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { videoId, playlistId } = req.params
    const userId = req.user?._id

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        { _id: playlistId, owner: userId },
        {
            $push: {
                videos: {
                    $each: [videoId],
                    $position: 0,
                },
            },
        },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(404, 'Playlist not found or you are not allowed');
    }

    res.status(200).json(new ApiResponse(200, updatedPlaylist, 'Video added to playlist successfully'));
})

export const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    const userId = req.user?._id;

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        { _id: playlistId, videos: videoId, owner: userId },
        {
            $pull: { videos: videoId },
        },
        { new: true }
    )

    if (!updatedPlaylist) {
        throw new ApiError(500, 'Video not found in the playlist');
    }

    res.status(200).json(new ApiResponse(200, updatedPlaylist, 'Video removed from playlist successfully'));
})



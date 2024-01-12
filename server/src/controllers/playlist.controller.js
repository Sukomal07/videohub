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
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner'
            },
        },
        {
            $unwind: '$owner'
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'videos',
                foreignField: '_id',
                as: 'videos',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'owner',
                            foreignField: '_id',
                            as: 'owner'
                        }
                    },
                    {
                        $addFields: {
                            ownerName: { $arrayElemAt: ['$owner.fullName', 0] },
                        }
                    }
                ]
            }
        },
        {
            $unwind: {
                path: '$videos',
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $addFields: {
                createdBy: '$owner.fullName'
            }
        },
        {
            $group: {
                _id: '$_id',
                name: { $first: '$name' },
                description: { $first: '$description' },
                createdBy: { $first: '$createdBy' },
                createdAt: { $first: '$createdAt' },
                updatedAt: { $first: '$updatedAt' },
                totalVideos: { $sum: 1 },
                totalViews: { $sum: { $ifNull: ['$videos.views', 0] } },
                videos: {
                    $push: {
                        _id: '$videos._id',
                        title: '$videos.title',
                        thumbnail: '$videos.thumbnail',
                        duration: '$videos.duration',
                        views: '$videos.views',
                        created: '$videos.createdAt',
                        ownerName: '$videos.ownerName',
                    },
                },
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
                videos: 1
            }
        }

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
        [
            {
                $set: {
                    videos: {
                        $cond: {
                            if: { $isArray: '$videos' },
                            then: {
                                $concatArrays: [
                                    [new mongoose.Types.ObjectId(videoId)],
                                    {
                                        $setDifference: ['$videos', [new mongoose.Types.ObjectId(videoId)]],
                                    },
                                ],
                            },
                            else: [new mongoose.Types.ObjectId(videoId)],
                        },
                    },
                },
            },
        ],
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

    const playlist = await Playlist.findOne({
        _id: playlistId,
        videos: videoId,
        owner: userId,
    });

    if (!playlist) {
        throw new ApiError(404, 'Video not found in the playlist');
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: { videos: videoId },
        },
        { new: true }
    )
        .populate('videos', '_id title thumbnail duration views createdAt')
        .populate('owner', 'fullName');

    if (!updatedPlaylist) {
        throw new ApiError(500, 'Error removing video from the playlist');
    }

    res.status(200).json(new ApiResponse(200, updatedPlaylist, 'Video removed from playlist successfully'));
})



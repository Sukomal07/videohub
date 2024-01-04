import Video from "../models/video.model.js";
import User from "../models/user.model.js";
import Comment from "../models/comment.model.js";
import Like from "../models/like.model.js";
import DisLike from "../models/dislike.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFiles } from "../utils/cloudinary.js";
import { v2 } from "cloudinary";
import mongoose from 'mongoose';

export const uploadNewVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    if (!(title && description)) {
        throw new ApiError(400, "title and description is required")
    }

    if (!req.files.videoFile || !req.files.thumbnail) {
        throw new ApiError(400, 'Video file and thumbnail are required');
    }

    const localVideoPath = req.files.videoFile[0].path
    const localThumbnailPath = req.files.thumbnail[0].path
    let uploadedThumbnail;
    let uploadedVideoFile;
    try {
        uploadedThumbnail = await uploadFiles(localThumbnailPath)
    } catch (error) {
        throw new ApiError(400, 'thumbnail upload failed')
    }
    try {
        uploadedVideoFile = await uploadFiles(localVideoPath)
    } catch (error) {
        throw new ApiError(400, 'video upload failed')
    }

    const video = new Video({
        title,
        description,
        videoFile: {
            public_id: uploadedVideoFile.public_id,
            secure_url: uploadedVideoFile.secure_url
        },
        thumbnail: {
            public_id: uploadedThumbnail.public_id,
            secure_url: uploadedThumbnail.secure_url
        },
        owner: req.user?._id,
        duration: uploadedVideoFile?.duration
    })

    try {
        await video.validate()
    } catch (error) {
        const validationErrors = [];
        for (const key in error.errors) {
            validationErrors.push(error.errors[key].message);
        }
        throw new ApiError(400, validationErrors.join(', '));
    }
    await video.save()

    res.status(201).json(
        new ApiResponse(201, video, 'Video upload successfully')
    )
})

export const deleteVideo = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(400, 'No video found');
    }

    if (!video.owner.equals(userId)) {
        throw new ApiError(400, 'You are not allowed');
    }

    const user = await User.findById(userId);
    if (user && user.watchHistory.includes(videoId)) {
        user.watchHistory = user.watchHistory.filter((id) => id !== videoId);
        await user.save();
    }

    try {
        await v2.uploader.destroy(video.thumbnail?.public_id, {
            resource_type: 'image',
        });
        await v2.uploader.destroy(video.videoFile?.public_id, {
            resource_type: 'video',
        });
    } catch (error) {
        throw new ApiError(400, 'Failed to delete video');
    }

    await Promise.all([
        Comment.deleteMany({ video: videoId }),
        Like.deleteMany({ video: videoId }),
        DisLike.deleteMany({ video: videoId }),
    ]);

    await Video.findByIdAndDelete(videoId);

    res.status(200).json(new ApiResponse(200, '', 'Video deleted successfully'));
})

export const getAllVideo = asyncHandler(async (req, res) => {
    const videos = await Video.aggregate([
        { $match: { isPublished: true } },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'ownerInfo'
            }
        },
        {
            $unwind: '$ownerInfo'
        },
        {
            $project: {
                _id: 1,
                title: 1,
                videoFile: 1,
                thumbnail: 1,
                views: 1,
                duration: 1,
                createdAt: 1,
                owner: 1,
                ownerName: '$ownerInfo.fullName',
                ownerAvatar: '$ownerInfo.avatar',
            }
        }
    ]);

    res.status(200).json(
        new ApiResponse(200, videos, 'Published videos')
    );
})

export const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;
    const videoDetails = await Video.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: 'comments',
                localField: '_id',
                foreignField: 'video',
                as: 'comments',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'owner',
                            foreignField: '_id',
                            as: 'owner',
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $unwind: '$owner',
                    },
                ],
            },
        },
        {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'video',
                as: 'likes',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'likedBy',
                            foreignField: '_id',
                            as: 'owner',
                        },
                    },
                    {
                        $unwind: '$owner',
                    },
                ],
            },
        },
        {
            $lookup: {
                from: 'dislikes',
                localField: '_id',
                foreignField: 'video',
                as: 'dislikes',
                pipeline: [
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'disLikedBy',
                            foreignField: '_id',
                            as: 'owner',
                        },
                    },
                    {
                        $unwind: '$owner',
                    },
                ],
            },
        },
        {
            $addFields: {
                comments: "$comments",
                likeCount: { $size: '$likes' },
                dislikeCount: { $size: '$dislikes' },
                totalCommentCount: { $size: '$comments' },
            }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                thumbnail: 1,
                videoFile: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: 1,
                comments: 1,
                likeCount: 1,
                dislikeCount: 1,
                totalCommentCount: 1,
            },
        }
    ]);

    if (videoDetails.length === 0) {
        throw new ApiError(404, 'Video not found');
    }

    if (userId) {
        await User.findByIdAndUpdate(userId, {
            $push: {
                watchHistory: videoId
            }
        }, { new: true });
    }

    res.status(200).json(new ApiResponse(200, videoDetails[0], 'Video fetched successfully'));
})

export const likeVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, 'Video not found');
    }

    const existingLike = await Like.findOne({ video: videoId, likedBy: userId });
    const existingDislike = await DisLike.findOne({ video: videoId, disLikedBy: userId });

    if (existingLike) {
        await existingLike.deleteOne({ _id: existingLike._id })
        res.status(200).json(new ApiResponse(200, '', 'Video like removed'));
    } else {
        if (existingDislike) {
            await existingDislike.deleteOne({ _id: existingDislike._id });
        }
        const newLike = new Like({
            video: videoId,
            likedBy: userId,
        });

        await newLike.save();

        res.status(201).json(new ApiResponse(201, newLike, 'Video liked successfully'));
    }
})

export const disLikeVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, 'Video not found');
    }

    const existingLike = await Like.findOne({ video: videoId, likedBy: userId });
    const existingDislike = await DisLike.findOne({ video: videoId, disLikedBy: userId });

    if (existingDislike) {
        await existingDislike.deleteOne({ _id: existingDislike._id });
        res.status(200).json(new ApiResponse(200, '', 'Video dislike removed'));
    } else {
        if (existingLike) {
            await existingLike.deleteOne({ _id: existingLike._id });
        }
        const newDisLike = new DisLike({
            video: videoId,
            disLikedBy: userId
        });

        await newDisLike.save();

        res.status(201).json(new ApiResponse(201, newDisLike, 'Video disliked successfully'));
    }
})

export const commentOnVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, 'Video not found');
    }

    if (!content) {
        throw new ApiError(400, "comment is required");
    }

    const newComment = new Comment({
        content,
        video: videoId,
        owner: userId,
    });

    await newComment.save();

    res.status(201).json(new ApiResponse(201, newComment, 'Comment added successfully'));
})
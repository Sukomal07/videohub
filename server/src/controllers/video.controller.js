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
import JWT from "jsonwebtoken";

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
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]);

    res.status(200).json(
        new ApiResponse(200, videos, 'Published videos')
    );
})

export const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const videoDetails = await Video.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: 'comments',
                localField: '_id',
                foreignField: 'video',
                as: 'comments',
            }
        },
        {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'video',
                as: 'likes',
            },
        },
        {
            $lookup: {
                from: 'dislikes',
                localField: '_id',
                foreignField: 'video',
                as: 'dislikes',
            },
        },
        {
            $addFields: {
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
                likeCount: 1,
                dislikeCount: 1,
                totalCommentCount: 1
            },
        },
    ]);

    if (videoDetails.length === 0) {
        throw new ApiError(404, 'Video not found');
    }

    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

    const token = req.cookies?.accessToken
    if (token) {
        const userDetails = await JWT.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const { _id } = userDetails
        if (_id) {
            await User.findByIdAndUpdate(_id, {
                $pull: { watchHistory: videoId }
            }, { new: true });
            await User.findByIdAndUpdate(_id, {
                $push: {
                    watchHistory: {
                        $each: [videoId],
                        $position: 0,
                    }
                },
            }, { new: true });

        }
    }

    res.status(200).json(new ApiResponse(200, videoDetails[0], 'Video fetched successfully'));
})

export const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user?._id

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, 'video not found');
    }

    if (!video.owner.equals(userId)) {
        throw new ApiError(400, 'You are not allowed')
    }

    for (const key in req.body) {
        video[key] = req.body[key];
    }

    if (req.file) {
        let uploadedThumbnail;
        const localThumbnailPath = req.file.path
        try {
            await v2.uploader.destroy(video.thumbnail?.public_id, {
                resource_type: 'image'
            })
            uploadedThumbnail = await uploadFiles(localThumbnailPath)
        } catch (error) {
            throw new ApiError(400, 'thumbnail upload failed')
        }
        video.thumbnail.public_id = uploadedThumbnail?.public_id
        video.thumbnail.secure_url = uploadedThumbnail?.secure_url
    }

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

    res.status(200).json(
        new ApiResponse(200, video, 'video updated successfully')
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

export const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user?._id

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400, 'No video found');
    }

    if (!video.owner.equals(userId)) {
        throw new ApiError(400, 'You are not allowed');
    }

    video.isPublished = !(video.isPublished)

    await video.save()

    res.status(200).json(
        new ApiResponse(200, '', 'Video visibility changed')
    )
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

export const editComment = asyncHandler(async (req, res) => {
    const { commentId, videoId } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, 'Comment not found');
    }

    if (!comment.owner.equals(userId)) {
        throw new ApiError(403, 'You are not allowed to edit this comment');
    }

    if (!comment.video.equals(videoId)) {
        throw new ApiError(403, 'Comment does not belong to the this video');
    }

    comment.content = content;

    await comment.save();

    res.status(200).json(
        new ApiResponse(200, comment, 'Comment edit successfully')
    );
})

export const deleteComment = asyncHandler(async (req, res) => {
    const { commentId, videoId } = req.params;
    const userId = req.user?._id;

    const deletedComment = await Comment.findOneAndDelete({
        _id: commentId,
        owner: userId,
        video: videoId,
    });

    if (!deletedComment) {
        throw new ApiError(404, 'Comment not found or you are not allowed to delete this comment');
    }

    res.status(200).json(new ApiResponse(200, '', 'Comment deleted successfully'));
})

export const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const userId = req.user?._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, 'Comment not found');
    }

    const existingLike = await Like.findOne({ comment: commentId, likedBy: userId });
    const existingDislike = await DisLike.findOne({ comment: commentId, disLikedBy: userId });

    if (existingLike) {
        await existingLike.deleteOne({ _id: existingLike._id })
        res.status(200).json(new ApiResponse(200, '', 'Comment like removed'));
    } else {
        if (existingDislike) {
            await existingDislike.deleteOne({ _id: existingDislike._id });
        }
        const newLike = new Like({
            comment: commentId,
            likedBy: userId,
        });

        await newLike.save();

        res.status(201).json(new ApiResponse(201, newLike, 'comment liked successfully'));
    }
})

export const toggleCommentDisLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const userId = req.user?._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, 'Comment not found');
    }

    const existingLike = await Like.findOne({ comment: commentId, likedBy: userId });
    const existingDislike = await DisLike.findOne({ comment: commentId, disLikedBy: userId });

    if (existingDislike) {
        await existingDislike.deleteOne({ _id: existingDislike._id })
        res.status(200).json(new ApiResponse(200, '', 'Comment dislike removed'));
    } else {
        if (existingLike) {
            await existingLike.deleteOne({ _id: existingLike._id });
        }
        const newDisLike = new DisLike({
            comment: commentId,
            disLikedBy: userId,
        });

        await newDisLike.save();

        res.status(201).json(new ApiResponse(201, newDisLike, 'comment disliked successfully'));
    }
})

export const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const videoComments = await Comment.aggregate([
        { $match: { video: new mongoose.Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'comment',
                as: 'likes',
            },
        },
        {
            $lookup: {
                from: 'dislikes',
                localField: '_id',
                foreignField: 'comment',
                as: 'dislikes',
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'ownerInfo',
            },
        },
        {
            $unwind: '$ownerInfo',
        },
        {
            $addFields: {
                likeCount: { $size: '$likes' },
                dislikeCount: { $size: '$dislikes' },
                ownerFullName: '$ownerInfo.fullName',
                ownerUsername: '$ownerInfo.userName',
                ownerAvatar: '$ownerInfo.avatar',
            },
        },
        {
            $project: {
                _id: 1,
                content: 1,
                owner: 1,
                createdAt: 1,
                likeCount: 1,
                dislikeCount: 1,
                ownerFullName: 1,
                ownerUsername: 1,
                ownerAvatar: 1,
            },
        },
    ]);

    res.status(200).json(
        new ApiResponse(200, videoComments, "Video comments fetched successfully")
    );
})

export const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    const likedVideos = await Like.aggregate([
        {
            $match: { likedBy: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: 'videos',
                localField: 'video',
                foreignField: '_id',
                as: 'videoDetails',
            },
        },
        {
            $unwind: '$videoDetails',
        },
        {
            $lookup: {
                from: 'users',
                localField: 'videoDetails.owner',
                foreignField: '_id',
                as: 'ownerInfo',
            },
        },
        {
            $unwind: '$ownerInfo',
        },
        {
            $addFields: {
                ownerFullName: '$ownerInfo.fullName',
                ownerUsername: '$ownerInfo.userName',
                ownerAvatar: '$ownerInfo.avatar',
            },
        },
        {
            $project: {
                _id: '$videoDetails._id',
                title: '$videoDetails.title',
                description: '$videoDetails.description',
                thumbnail: '$videoDetails.thumbnail',
                videoFile: '$videoDetails.videoFile',
                duration: '$videoDetails.duration',
                views: '$videoDetails.views',
                isPublished: '$videoDetails.isPublished',
                createdAt: '$videoDetails.createdAt',
                updatedAt: '$videoDetails.updatedAt',
                owner: '$videoDetails.owner',
                ownerFullName: 1,
                ownerUsername: 1,
                ownerAvatar: 1,
            },
        },
    ]);

    res.status(200).json(
        new ApiResponse(200, likedVideos, 'Liked videos fetched successfully')
    );
})
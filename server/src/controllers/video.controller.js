import Video from "../models/video.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadFiles } from "../utils/cloudinary.js";
import { v2 } from "cloudinary";

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
    const userId = req.user?._id
    const { videoId } = req.params

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, 'No video found')
    }

    if (!video.owner.equals(userId)) {
        throw new ApiError(400, 'You are not allowed');
    }

    try {
        await v2.uploader.destroy(video.thumbnail?.public_id, {
            resource_type: 'image'
        })
        await v2.uploader.destroy(video.videoFile?.public_id, {
            resource_type: 'video'
        })
    } catch (error) {
        throw new ApiError(400, 'Failed to delete video')
    }

    await Video.findByIdAndDelete(videoId)
    res.status(200).json(
        new ApiResponse(200, '', 'Video deleted successfully')
    )
})
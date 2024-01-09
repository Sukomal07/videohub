import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from '../utils/apiError.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { uploadFiles } from '../utils/cloudinary.js'
import { v2 } from 'cloudinary'
import User from "../models/user.model.js";
import JWT from 'jsonwebtoken'
import mongoose from "mongoose";


const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(400, 'User does not exists')
        }

        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, error.message)
    }
}

export const registerUser = asyncHandler(async (req, res) => {
    const { userName, fullName, email, password } = req.body

    if (!userName || !fullName || !email || !password) {
        throw new ApiError(400, "All feilds are required")
    }

    const existingUser = await User.findOne({
        $or: [{ email }, { userName }]
    })

    if (existingUser) {
        throw new ApiError(409, "User with this email or username already exists")
    }

    const user = new User({
        userName,
        fullName,
        email,
        password
    })

    try {
        await user.validate()
    } catch (error) {
        const validationErrors = [];
        for (const key in error.errors) {
            validationErrors.push(error.errors[key].message);
        }
        throw new ApiError(400, validationErrors.join(', '));
    }

    if (!req.files.avatar) {
        throw new ApiError(400, "avatar is required")
    }
    const avatarLocalPath = req.files.avatar[0].path;
    const coverImagePath = req.files && req.files.coverImage && req.files.coverImage[0].path;
    const avatarImage = await uploadFiles(avatarLocalPath)
    const coverImage = await uploadFiles(coverImagePath)

    user.avatar.public_id = avatarImage?.public_id
    user.avatar.secure_url = avatarImage?.secure_url

    user.coverImage.public_id = coverImage?.public_id
    user.coverImage.secure_url = coverImage?.secure_url


    await user.save()
    user.password = undefined

    res.status(201).json(
        new ApiResponse(200, user, "User created successfully")
    )
})

export const loginUser = asyncHandler(async (req, res) => {
    const { userName, email, password } = req.body

    if (!userName && !email) {
        throw new ApiError(400, "username or email is required")
    }

    if (!password) {
        throw new ApiError(400, 'password is required')
    }

    const user = await User.findOne({
        $or: [{ userName }, { email }]
    }).select("+password").select("-watchHistory")

    if (!user) {
        throw new ApiError(404, "User does not exists")
    }

    const isCorrectPassword = await user.isPasswordCorrect(password)

    if (!isCorrectPassword) {
        throw new ApiError(401, 'Invalid user credentials')
    }

    user.password = undefined

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

    const options = {
        httpOnly: true,
        secure: true
    }

    res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(201, user, 'user login successfully'))
})

export const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: ''
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, "user logout successfully")
        )
})

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken

    if (!refreshToken) {
        throw new ApiError(401, 'Please log in again')
    }
    const verifyRefreshToken = await JWT.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)

    if (!verifyRefreshToken) {
        throw new ApiError(401, "Unable to verify refresh token")
    }

    const user = await User.findById(verifyRefreshToken?._id)

    if (!user) {
        throw new ApiError(401, "Invalid refresh token")
    }

    if (refreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh token is expired or use")
    }

    const options = {
        httpOnly: true,
        secure: true
    }

    const { accessToken, newRefreshToken } = await generateAccessTokenAndRefreshToken(user?._id)

    res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(200, 'New access token generated'))

})

export const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword) {
        throw new ApiError(401, 'Both old and new password required')
    }

    const user = await User.findById(req.user._id).select("+password")

    const verifyOldPassword = await user.isPasswordCorrect(oldPassword)

    if (!verifyOldPassword) {
        throw new ApiError(401, "Old password is not correct")
    }
    if (oldPassword === newPassword) {
        throw new ApiError(401, "old password and new password can't be same")
    }

    user.password = newPassword

    try {
        await user.validate()
    } catch (error) {
        const validationErrors = [];
        for (const key in error.errors) {
            validationErrors.push(error.errors[key].message);
        }
        throw new ApiError(400, validationErrors.join(', '));
    }

    await user.save()
    user.password = undefined
    res.status(200).json(
        new ApiResponse(200, '', 'Password updated successfully')
    )
})

export const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id).select("-refreshToken")
    res.status(200).json(
        new ApiResponse(200, user, 'User fetched successfully')
    )
})

export const updateProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id).select("-refreshToken");

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const existingUser = await User.findOne({
        $or: [
            { email: req.body?.email },
            { userName: req.body?.userName }
        ]
    });

    if (existingUser) {
        if (existingUser.email === req.body?.email) {
            throw new ApiError(400, "Email is already in use");
        }
        if (existingUser.userName === req.body?.userName) {
            throw new ApiError(400, "Username is already in use");
        }
    }

    for (const key in req.body) {
        user[key] = req.body[key];
    }

    try {
        await user.validate()
    } catch (error) {
        const validationErrors = [];
        for (const key in error.errors) {
            validationErrors.push(error.errors[key].message);
        }
        throw new ApiError(400, validationErrors.join(', '));
    }
    const updatedUser = await user.save();

    res.status(200).json(new ApiResponse(200, updatedUser, "User updated successfully"));
})

export const updateImages = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id).select("-refreshToken");

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    try {
        if (req.files && req.files.avatar) {
            const avatarLocalPath = req.files.avatar[0].path;
            await v2.uploader.destroy(user.avatar.public_id, {
                resource_type: 'image'
            })
            const avatarImage = await uploadFiles(avatarLocalPath);
            user.avatar.public_id = avatarImage?.public_id;
            user.avatar.secure_url = avatarImage?.secure_url;
        }

        if (req.files && req.files.coverImage) {
            const coverImagePath = req.files.coverImage[0].path;
            await v2.uploader.destroy(user.coverImage.public_id, {
                resource_type: 'image'
            })
            const coverImage = await uploadFiles(coverImagePath);
            user.coverImage.public_id = coverImage?.public_id;
            user.coverImage.secure_url = coverImage?.secure_url;
        }

        const updatedUser = await user.save();

        res.status(200).json(new ApiResponse(200, updatedUser, "Images updated successfully"));
    } catch (error) {
        console.error(error.message);
        throw new ApiError(500, "Failed to update user images. Please try again later.");
    }
})

export const deleteAccount = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndDelete(req.user?._id)

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    await v2.uploader.destroy(user.avatar?.public_id, {
        resource_type: 'image'
    })
    await v2.uploader.destroy(user.coverImage?.public_id, {
        resource_type: 'image'
    })

    res.status(200).json(
        new ApiResponse(200, '', "Profile deleted successfully")
    )
})

export const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
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
        },
        {
            $addFields: {
                watchHistory: { $reverseArray: "$watchHistory" }
            }
        },
        {
            $project: {
                watchHistory: 1
            }
        }
    ])

    res.status(200).json(
        new ApiResponse(200, user[0].watchHistory, "watch history fetched successfully")
    )
})
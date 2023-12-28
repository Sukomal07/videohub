import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from '../utils/apiError.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { uploadFiles } from '../utils/cloudinary.js'
import { v2 } from 'cloudinary'
import User from "../models/user.model.js";
import JWT from 'jsonwebtoken'


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
    }).select("+password")

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
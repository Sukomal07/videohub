import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from '../utils/apiError.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { uploadFiles } from '../utils/cloudinary.js'
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
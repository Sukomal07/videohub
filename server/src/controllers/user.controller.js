import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from '../utils/apiError.js'
import { ApiResponse } from '../utils/apiResponse.js'
import { uploadFiles } from '../utils/cloudinary.js'
import User from "../models/user.model.js";

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

})
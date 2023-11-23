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

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImagePath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required")
    }

    const avatarImage = await uploadFiles(avatarLocalPath)
    const coverImage = await uploadFiles(coverImagePath)

    const user = new User({
        userName,
        fullName,
        email,
        password,
        avatar: {
            public_id: avatarImage?.public_id,
            secure_url: avatarImage?.secure_url
        },
        coverImage: {
            public_id: coverImage?.public_id,
            secure_url: coverImage?.secure_url
        }
    })

    try {
        await user.validate()
    } catch (error) {
        const validationErrors = [];
        for (const key in error.errors) {
            validationErrors.push(error.errors[key].message);
        }
        return res.status(400).json(
            new ApiResponse(400, null, validationErrors.join(', '))
        );
    }

    await user.save()
    user.password = undefined

    res.status(201).json(
        new ApiResponse(200, user, "User created successfully")
    )
})
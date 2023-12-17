import { ApiError } from "../utils/apiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import JWT from 'jsonwebtoken'

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.accessToken
    if (!token) {
        throw new ApiError(400, "Please log in again")
    }
    const userDetails = await JWT.verify(token, process.env.ACCESS_TOKEN_SECRET)

    req.user = userDetails

    next()
})
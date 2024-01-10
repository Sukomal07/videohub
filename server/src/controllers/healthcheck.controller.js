import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

export const healthcheck = asyncHandler(async (req, res) => {
    res.status(200).json(
        new ApiResponse(200, '', 'Health check passed successfully')
    );
});

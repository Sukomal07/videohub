import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from 'mongoose';

export const toggleSubscription = asyncHandler(async (req, res) => {
    const subscriberId = req.user?._id;
    const { channelId } = req.params;

    const existChannel = await User.findById(channelId);

    if (!existChannel) {
        throw new ApiError(404, 'Channel not found');
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: new mongoose.Types.ObjectId(subscriberId),
        channel: new mongoose.Types.ObjectId(channelId),
    });

    if (existingSubscription) {
        await Subscription.findByIdAndDelete(existingSubscription._id);
        res.status(200).json(new ApiResponse(200, '', 'Unsubscribed successfully'));
    } else {
        const newSubscription = new Subscription({
            subscriber: new mongoose.Types.ObjectId(subscriberId),
            channel: new mongoose.Types.ObjectId(channelId),
        });
        await newSubscription.save();
        res.status(200).json(new ApiResponse(200, '', 'Subscribed successfully'));
    }
})

export const getChannelSubscribers = asyncHandler(async (req, res) => {
    const channelId = req.user?._id

    const existChannel = await User.findById(channelId);

    if (!existChannel) {
        throw new ApiError(404, 'Channel not found');
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberInfo",
            },
        },
        {
            $unwind: "$subscriberInfo",
        },
        {
            $project: {
                _id: "$subscriberInfo._id",
                fullName: "$subscriberInfo.fullName",
                userName: "$subscriberInfo.userName",
                avatar: "$subscriberInfo.avatar",
                createdAt: "$subscriberInfo.createdAt",
            },
        },
    ]);

    if (!subscribers.length) {
        throw new ApiError(404, "No subscribers found")
    }

    res.status(200).json(
        new ApiResponse(200, subscribers, 'All subscribers')
    )
})

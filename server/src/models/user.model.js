import { Schema, model } from 'mongoose'
import JWT from 'jsonwebtoken'
import bcryctJs from 'bcryptjs'
import crypto from 'crypto'

const userSchema = new Schema({
    userName: {
        type: String,
        required: [true, 'Username is required'],
        lowercase: true,
        unique: true,
        trim: true,
        index: true
    },
    fullName: {
        type: String,
        required: [true, 'Name is required'],
        minLength: [3, 'Name must be at least 3 character'],
        maxLength: [15, 'Name should be less than 15 character'],
        lowercase: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'Please Enter a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minLength: [8, 'Password must be at least 8 character '],
        match: [/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/, 'Password must be contains at least one uppercase and one lowercase and one digit and one special character'],
        select: false
    },
    avatar: {
        public_id: {
            type: String
        },
        secure_url: {
            type: String
        }
    },
    covarImage: {
        public_id: {
            type: String
        },
        secure_url: {
            type: String
        }
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    refreshToken: String,
    forgotPasswordToken: String,
    forgotPasswordExpiry: Date
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    this.password = await bcryctJs.hash(this.password, 10);
})

userSchema.methods = {
    isPasswordCorrect: async function (password) {
        return await bcryctJs.compare(password, this.password);
    },
    generateAccessToken: async function () {
        return JWT.sign({
            _id: this._id,
            userName: this.userName,
            fullName: this.fullName,
            email: this.email
        }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        })
    },
    generateRefreshToken: async function () {
        return JWT.sign({
            _id: this._id,
        }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        })
    },
    generateResetToken: async function () {
        const resetToken = crypto.randomBytes(20).toString('hex')
        this.forgotPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')
        this.forgotPasswordExpiry = Date.now() + 15 * 60 * 1000
        return resetToken;
    }
}

const User = model("User", userSchema);

export default User;
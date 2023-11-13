import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'

export const uploadFiles = async (path) => {
    try {
        if (path) {
            const response = await cloudinary.uploader.upload(path, {
                folder: 'videohub',
                resource_type: 'auto'
            });
            return response;
        }
    } catch (error) {
        console.error('Error uploading file to Cloudinary:', error);
    } finally {
        if (path) {
            try {
                fs.unlinkSync(path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }
    }

    return null;
};

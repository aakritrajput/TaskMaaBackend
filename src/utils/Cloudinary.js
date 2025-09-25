import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";
import { ApiError } from './ApiError.js';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (filePath) => {
    try {
        if(!filePath) return null;
        const image = await cloudinary.uploader.upload(filePath, {
            folder: "TaskMaa",
            resource_type: "auto"
        });
        fs.unlinkSync(filePath);
        return image;
    }catch(error){
        fs.unlinkSync(filePath);
        console.log(`Error uploading on cloudinary ${error}`)
        return null;
    }
}

const extractPublicId = (url) => {
    let parts = url.split('/upload/')[1]; // "v1690000000/TaskMaa/sample.jpg"
    parts = parts.split('.')[0];          // "v1690000000/TaskMaa/sample"
    
    const withoutVersion = parts.split('/').slice(1).join('/'); // remove "v1690000000"
    return withoutVersion;
};

const deleteFromCloudinary = async (url) => {
    try {
        const publicId = extractPublicId(url);

        const result = await cloudinary.uploader.destroy(publicId);

        console.log("Cloudinary delete result:", result);
    
        if (result.result !== "ok") {
          throw new ApiError(500, `Failed to delete image. Cloudinary response: ${result.result}`);
        }
        return 'OK'
    } catch (error) {
        throw new ApiError(error.statusCode || 500, error.message || "unable to delete video from cloudinary")
    }
}

export {uploadOnCloudinary, deleteFromCloudinary};
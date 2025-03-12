import multer from "multer";
import path from "path";

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Save files in the "uploads" folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    },
});

// File filter
const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF and image files are allowed"), false);
    }
};

// Multer upload instance (Allow multiple files, max 5)
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB per file
});

export const uploadMultipleFiles = upload.array("emailAttachments", 5);

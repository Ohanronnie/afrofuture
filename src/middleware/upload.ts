import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store in uploads/admin-messages directory
    const uploadPath = path.join(
      process.cwd(),
      "uploads",
      "admin-messages"
    );
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

// File filter for images and PDFs
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept images and PDFs
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedPdfTypes = /pdf/;
  const extname = path.extname(file.originalname).toLowerCase();
  const isImage = allowedImageTypes.test(extname) && allowedImageTypes.test(file.mimetype);
  const isPdf = allowedPdfTypes.test(extname) && file.mimetype === "application/pdf";

  if (isImage || isPdf) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, GIF, WebP) and PDF files are allowed!"));
  }
};

// Create multer instance
export const uploadImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB limit (supports images and PDFs)
  },
});

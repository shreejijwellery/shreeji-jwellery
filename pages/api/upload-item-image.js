import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { authMiddleware } from './common/common.services';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function getS3Client() {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing AWS credentials in environment');
  }
  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function getPublicUrl(key) {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) return null;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const form = new IncomingForm({
    maxFileSize: MAX_FILE_SIZE,
    keepExtensions: true,
    multiples: false,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      if (err.message?.toLowerCase().includes('max file size')) {
        return res.status(413).json({ message: 'File too large. Max 5MB.' });
      }
      return res.status(500).json({ message: 'Error parsing upload' });
    }

    const file = files.image?.[0] || files.image || files.file?.[0] || files.file;
    if (!file?.filepath) {
      return res.status(400).json({ message: 'No image file provided. Use field name "image".' });
    }

    const mimetype = file.mimetype || '';
    if (!ALLOWED_TYPES.includes(mimetype)) {
      try { fs.unlinkSync(file.filepath); } catch (_) {}
      return res.status(400).json({
        message: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP.',
      });
    }

    let buffer;
    try {
      buffer = fs.readFileSync(file.filepath);
    } catch (readErr) {
      return res.status(500).json({ message: 'Failed to read uploaded file' });
    } finally {
      try { fs.unlinkSync(file.filepath); } catch (_) {}
    }

    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
      return res.status(500).json({ message: 'S3 bucket not configured' });
    }

    const ext = path.extname(file.originalFilename || '') || '.jpg';
    const key = `items/${req.userData._id}/${Date.now()}${ext}`;

    try {
      const s3 = getS3Client();
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
        })
      );
      const url = getPublicUrl(key);
      return res.status(200).json({ url, key });
    } catch (s3Err) {
      console.error('S3 upload error:', s3Err);
      return res.status(500).json({
        message: 'Failed to upload image',
        error: s3Err.message,
      });
    }
  });
};

export default authMiddleware(handler);

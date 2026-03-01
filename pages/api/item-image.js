import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const EXPIRES_IN = 3600; // 1 hour

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

/**
 * Extract S3 object key from a URL like:
 * https://bucket.s3.region.amazonaws.com/items/xxx/yyy.jpeg
 */
function keyFromS3Url(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, '');
    return path || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const url = req.query.url;
  const key = keyFromS3Url(url);

  if (!key) {
    return res.status(400).json({ message: 'Missing or invalid url parameter' });
  }

  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    return res.status(500).json({ message: 'S3 bucket not configured' });
  }

  try {
    const s3 = getS3Client();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: EXPIRES_IN });
    return res.redirect(302, signedUrl);
  } catch (err) {
    console.error('Item image signed URL error:', err);
    return res.status(500).json({ message: 'Failed to get image', error: err.message });
  }
}

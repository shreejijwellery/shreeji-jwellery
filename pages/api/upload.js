import multer from 'multer';
import fs from 'fs';
import nextConnect from 'next-connect';
import xlsx from 'xlsx';
import jwt from 'jsonwebtoken';
import connectToDatabase from '../../lib/mongodb';
import OrderFile from '../../models/OrderFile';
import User from '../../models/users';

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, '/tmp'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 100 * 1024 * 1024 }
});

const apiRoute = nextConnect({
  onError(error, req, res) {
    res.status(501).json({ error: `Sorry something happened! ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

apiRoute.use(upload.single('file'));

apiRoute.post(async (req, res) => {
  await connectToDatabase();

  const workbook = xlsx.read(fs.readFileSync(req.file.path), { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet);

  // Get user from token if available
  let companyId = null;
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const userData = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(userData.userId).lean();
      if (user) {
        companyId = user.company;
      }
    } catch (error) {
      // If token is invalid, continue without company filter
    }
  }

  const orderData = rows.map((row) => ({
    reason: row['Reason'],
    sku: row['SKU'],
    quantity: row['Quantity'],
    company: companyId, // Add company if available
  }));

  try {
    await OrderFile.insertMany(orderData);
    res.status(200).json({ message: 'File uploaded and data stored successfully!' });
  } finally {
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
  }
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default apiRoute;

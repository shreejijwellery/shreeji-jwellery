import multer from 'multer';
import nextConnect from 'next-connect';
import xlsx from 'xlsx';
import connectToDatabase from '../../lib/mongodb';
import OrderFile from '../../models/OrderFile';

const upload = multer({
  storage: multer.memoryStorage(),
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

  const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(worksheet);

  const orderData = rows.map((row) => ({
    reason: row['Reason'],
    sku: row['SKU'],
    quantity: row['Quantity'],
  }));

  await OrderFile.insertMany(orderData);

  res.status(200).json({ message: 'File uploaded and data stored successfully!' });
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default apiRoute;

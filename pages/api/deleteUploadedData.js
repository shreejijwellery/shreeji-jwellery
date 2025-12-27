import connectToDatabase from '../../lib/mongodb';
import OrderFile from '../../models/OrderFile';
import moment from 'moment-timezone';
import { authMiddleware } from './common/common.services';

async function handler(req, res) {
  const { method } = req;

  await connectToDatabase();

  const user = req.userData;
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (method === 'POST') {
    const {uploadId, sku} = req.body;
    let query = {
      company: user.company // Filter by user's company
    }
    if(uploadId) {
      let dateToFilter = new Date(uploadId);
      query = {
        ...query,
        uploadId,
        createdAt: {
          $gte: moment(dateToFilter).startOf('day').toDate(),
          $lte: moment(dateToFilter).endOf('day').toDate()
        }
      }
    }
    if(sku){
      query = {
        ...query,
        sku
      }
    }
    
   if(!uploadId && !sku) {
    res.status(400).json({ error: 'Can not delete data!' });
    return;
   }
  try {
    const data = await OrderFile.deleteMany(query);
    res.status(200).json({data,  message: 'Order files are deleted!' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleted data from the database' });
  }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export default authMiddleware(handler);
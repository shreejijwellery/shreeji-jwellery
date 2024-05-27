import connectToDatabase from '../../lib/mongodb';
import OrderFile from '../../models/OrderFile';

export default async function handler(req, res) {
  const { method } = req;

  await connectToDatabase();

  if (method === 'GET') {
    const {user, data} = req.query;
    const query = [
    {$match: {reason: 'PENDING'}},
    {$group : {
        _id: "$uploadId",
        quantity: {$sum: "$quantity"}
    }},
    
    {
        $project: {
            date: "$_id",
            quantity: 1,
        }
    },
    {
        $sort: {date: 1}
    }
    ]
   
  try {
    const data = await OrderFile.aggregate(query);
    res.status(200).json({data,  message: 'Order file fetched successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data from the database' });
  }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}
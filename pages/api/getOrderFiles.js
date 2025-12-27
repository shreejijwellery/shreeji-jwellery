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

  if (method === 'GET') {
    const {date} = req.query;
    let dateToFilter = new Date();
    if(date){
      dateToFilter = new Date(date);
    }

    const query = [
    {$match: {
      reason: 'PENDING',
      company: user.company, // Filter by user's company
      createdAt: {
        $gte: new Date(moment(dateToFilter).tz('IST' ).startOf('day')) ,
        $lte: new Date(moment(dateToFilter).tz('IST' ).endOf('day'))
      }
    }},
    {$group : {
        _id: {sku : "$sku", uploadId: "$uploadId", user : "$user"},
        quantity: {$sum: "$quantity"},
    }},
    {$lookup: {
        from: "masterfiles",
        let: { sku: "$_id.sku", companyId: user.company },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$sku", "$$sku"] },
                  { $eq: ["$company", "$$companyId"] } // Filter masterfiles by company too
                ]
              }
            }
          }
        ],
        as: "price"
    }},
    {
        $project: {
            sku: "$_id.sku",
            quantity: 1,
            price: { $arrayElemAt: [ "$price.price", 0 ] },
            uploadId: "$_id.uploadId",
            uploadedBy: "$_id.user"
        }
    },
    {
        $sort: {sku: 1}
    }
    ]
   
  try {
    const data = await OrderFile.aggregate(query);
    res.status(200).json({data,  message: 'Order files are already uploaded today!' });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data from the database' });
  }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export default authMiddleware(handler);
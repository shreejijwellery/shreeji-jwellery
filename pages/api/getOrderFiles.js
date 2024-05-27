import connectToDatabase from '../../lib/mongodb';
import OrderFile from '../../models/OrderFile';
import moment from 'moment-timezone';
export default async function handler(req, res) {
  const { method } = req;

  await connectToDatabase();

  if (method === 'GET') {
    const {user, data, date} = req.query;
    let dateToFilter = new Date();
    if(date){
      dateToFilter = new Date(date);
    }
    const query = [
    {$match: {
      reason: 'PENDING',
      createdAt: {
        $gte: moment(dateToFilter).tz('IST').startOf('day').toDate(),
        $lte: moment(dateToFilter).tz('IST').endOf('day').toDate()
      }
    }},
    {$group : {
        _id: {sku : "$sku", uploadId: "$uploadId", user : "$user"},
        quantity: {$sum: "$quantity"},
    }},
    {$lookup: {
        from: "masterfiles",
        localField: "_id.sku",
        foreignField: "sku",
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
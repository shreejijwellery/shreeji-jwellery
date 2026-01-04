import connectToDatabase from '../../lib/mongodb';
import MasterFile from '../../models/MasterFile';
import User from '../../models/users';

export default async function handler(req, res) {
  const { method } = req;

  await connectToDatabase();

  if (method === 'POST') {
    const {user, data} = req.body;
    
    // Fetch user to get company
    const userDoc = await User.findById(user.userId).lean();
    if (!userDoc) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const extractedData = data.map((order) => {
      return {
        sku: order['STYLE ID'],
        price: order['PRICE'],
        company: userDoc.company, // Add company field
        user: {
          userId: user.userId,
          name: user.name,
        }
      }
    })
   
  try {
    await MasterFile.insertMany(extractedData);
    res.status(200).json({ message: 'Order file uploaded and data stored successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Error saving data to the database' });
  }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}
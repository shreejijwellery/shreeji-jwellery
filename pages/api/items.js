import connectToDatabase from '../../lib/mongodb';
import OrderFile from '../../models/OrderFile';
import moment from 'moment-timezone';
import Item from '../../models/items';
import mongoose from 'mongoose';
export default async function handler(req, res) {
  const { method } = req;

  await connectToDatabase();

  if (method === 'GET') {
    const query = req.query;
    const {section} = query;
  try {
    let criteria = {isDeleted: false};
    if(section){
        criteria.section = new mongoose.Types.ObjectId(section) ;
    }
    const items = await Item.find(criteria)
    res.status(200).json({ items, message: 'Items fetched successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Items from the database', error: error.message });
  }


  }if(method === 'POST'){
    const body = req.body;
    const {name, value, user, rate, section} = body;

    const item = new Item({name, value,user: {userId : user._id,name: user.name }, rate, section});
    try {
      const result = await item.save();
      res.status(200).json({message: 'Item created successfully!', item : result});
    } catch (error) {
      res.status(500).json({message: 'Error creating section', error: error.message});
    }
  } else if(method === 'DELETE'){
    const body = req.body;
    const {id} = body;
    try {
        const result = await Item.updateOne({_id: id }, {$set : {isDeleted: true}});
        res.status(200).json({ result, message: 'Item deleted successfully!'});
    }
    catch (error) {
      res.status(500).json({message: 'Error deleting item', error: error.message});
    }
  } else if (method === 'PUT') {
    const { id } = req.query; // Extract id from query parameters
    const body = req.body;
    const {_id, name, value, user, rate, section } = body; // Destructure the body to get item details
    try {
        const updatedItem = await Item.findByIdAndUpdate(
            _id, 
            { name, value, user: { userId: user._id, name: user.name }, rate, section },
            { new: true } // Return the updated document
        );
        res.status(200).json({ item: updatedItem, message: 'Item updated successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating item', error: error.message });
    }
  } {
    // res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}

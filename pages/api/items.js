import connectToDatabase from '../../lib/mongodb';
import OrderFile from '../../models/OrderFile';
import moment from 'moment-timezone';
import Item from '../../models/items';
import mongoose from 'mongoose';
import { authMiddleware } from './common/common.services';

const handler = async (req, res) => {
  const { method } = req;

  await connectToDatabase();

  if (method === 'GET') {
    const query = req.query;
    const { section } = query;
    const company = req.userData?.company;
    try {
      let criteria = { isDeleted: false, company };
      if (section) {
        criteria.section = new mongoose.Types.ObjectId(section);
      }

      const items = await Item.find(criteria).lean();
      res.status(200).json({ items, message: 'Items fetched successfully!' });
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Error fetching Items from the database', error: error.message });
    }
  } else if (method === 'POST') {
    const body = req.body;
    const { _id, company } = req.userData;
    const { name, rate, section } = body;

    const item = new Item({ name, lastModifiedBy: _id, rate, section, company });
    try {
      const result = await item.save();
      res.status(200).json({ message: 'Item created successfully!', item: result });
    } catch (error) {
      res.status(500).json({ message: 'Error creating section', error: error.message });
    }
  } else if (method === 'DELETE') {
    const { _id, company } = req.userData;
    const body = req.body;
    const { id } = body;
    try {
      const result = await Item.updateOne(
        { _id: id, company },
        { $set: { isDeleted: true, lastModifiedBy: _id } }
      );
      res.status(200).json({ result, message: 'Item deleted successfully!' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting item', error: error.message });
    }
  } else if (method === 'PUT') {
    const { id } = req.query; // Extract id from query parameters
    const userId = req?.userData?._id;
    const body = req.body;
    const { _id, name, user, rate, section } = body; // Destructure the body to get item details
    try {
      const updatedItem = await Item.findByIdAndUpdate(
        _id,
        { name, rate, section, lastModifiedBy: userId },
        { new: true } // Return the updated document
      );
      res.status(200).json({ item: updatedItem, message: 'Item updated successfully!' });
    } catch (error) {
      res.status(500).json({ message: 'Error updating item', error: error.message });
    }
  }
  {
    // res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
};

export default authMiddleware(handler);

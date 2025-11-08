import connectToDatabase from '../../lib/mongodb';
import OrderFile from '../../models/OrderFile';
import moment from 'moment-timezone';
import Item from '../../models/items';
import Section from '../../models/section';
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

    try {
      // Get the section details to check if it's "Final Product"
      const sectionDetails = await Section.findById(section).lean();
      
      if (!sectionDetails) {
        return res.status(404).json({ message: 'Section not found' });
      }

      // Check if the section is "Final Product" (case-insensitive)
      const isFinalProductSection = sectionDetails.name.toLowerCase() === 'final product';

      if (isFinalProductSection) {
        // If it's Final Product, add the item to ALL sections
        const allSections = await Section.find({ isDeleted: false, company }).lean();
        
        const itemsToCreate = allSections.map(sec => ({
          name,
          rate,
          section: sec._id,
          lastModifiedBy: _id,
          company
        }));

        // Bulk insert all items
        const createdItems = await Item.insertMany(itemsToCreate);
        
        // Return the item that was created for the Final Product section
        const finalProductItem = createdItems.find(item => 
          item.section.toString() === section.toString()
        );

        return res.status(200).json({ 
          message: 'Item created successfully in all sections!', 
          item: finalProductItem || createdItems[0],
          itemsCreated: createdItems.length
        });
      } else {
        // Normal behavior: create item only in the selected section
        const item = new Item({ name, lastModifiedBy: _id, rate, section, company });
        const result = await item.save();
        return res.status(200).json({ message: 'Item created successfully!', item: result });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error creating item', error: error.message });
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

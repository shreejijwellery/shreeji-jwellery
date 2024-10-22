import connectToDatabase from '../../lib/mongodb';
import OrderFile from '../../models/OrderFile';
import moment from 'moment-timezone';
import Section from '../../models/section';
import mongoose from 'mongoose';
export default async function handler(req, res) {
  const { method } = req;

  await connectToDatabase();

  if (method === 'GET') {
  try {
    const sections = await Section.find({isDeleted: false});
    res.status(200).json({ sections, message: 'Sections fetched successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message, message: 'Error fetching sections from the database' }); // Added separate message key
  }


  }if(method === 'POST'){
    const body = req.body;
    const {name, value, user} = body;
    const section = new Section({name, value, user : {userId : user._id, name: user.name}});
    try {
      await section.save();
      res.status(200).json({message: 'Section created successfully!'});
    } catch (error) {
      res.status(500).json({error: error.message, message: 'Error creating section' }); // Added separate message key
    }
  } 
  else if(method === 'DELETE'){
    const body = req.body;
    const {id} = body;
    try {
        const result = await Section.updateOne({_id: id }, {$set : {isDeleted: true}});
        res.status(200).json({ result, message: 'Section deleted successfully!'});
    }
    catch (error) {
      res.status(500).json({error: error.message, message: 'Error deleting section' }); // Added separate message key
    }
  } else if (method === 'PUT') {
    const body = req.body;
    
    const { _id, name, value, user } = body;
    const updateFields = {};
    if (name) updateFields.name = name;
    if (value) updateFields.value = value;
    if (user) updateFields.user = {userId : user._id, name: user.name};
    try {
      const result = await Section.updateOne({ _id: new mongoose.Types.ObjectId(_id)  }, { $set: updateFields });
      res.status(200).json({ result, message: 'Section updated successfully!' });
    } catch (error) {
      res.status(500).json({ error: error.message, message: 'Error updating section' }); // Added separate message key
    }
  } {
    // res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}

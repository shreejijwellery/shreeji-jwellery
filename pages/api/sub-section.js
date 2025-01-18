import connectToDatabase from '../../lib/mongodb';
import SubSection from '../../models/subSections';
import mongoose from 'mongoose';
import { authMiddleware } from './common/common.services';
const handler = async (req, res) => {
  const { method, query, userData } = req;

  await connectToDatabase();

  if (method === 'GET') {
  try {
    const subSections = await SubSection.find({isDeleted: false, company : userData?.company}).populate({path: 'lastModifiedBy', select: 'name'}).lean();
    res.status(200).json({ subSections: subSections, message: 'Sub Sections fetched successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message, message: 'Error fetching sub sections from the database' }); // Added separate message key
  }


  }if(method === 'POST'){
    const {userData} = req;

    const body = req.body;
    const {name, section} = body;
    const subSection = new SubSection({name, section, lastModifiedBy : userData?._id, company : userData?.company });
    try {
      await subSection.save();
      res.status(200).json({message: 'Section created successfully!'});
    } catch (error) {
      res.status(500).json({error: error.message, message: 'Error creating section' }); // Added separate message key
    }
  } 
  else if(method === 'DELETE'){
    const body = req.body;
    const {id} = body;
    try {
        const result = await SubSection.updateOne({_id: id }, {$set : {isDeleted: true}});
     
        res.status(200).json({ result, message: 'Section deleted successfully!'});
    }
    catch (error) {
      res.status(500).json({error: error.message, message: 'Error deleting section' }); // Added separate message key
    }
  } else if (method === 'PUT') {
    const body = req.body;
    
    const { _id, name, user } = body;
    const updateFields = {};
    if (name) updateFields.name = name;
    if (user) updateFields.user = {userId : user._id, name: user.name};
    try {
      const result = await SubSection.updateOne({ _id: new mongoose.Types.ObjectId(_id)  }, { $set: updateFields });
      res.status(200).json({ result, message: 'Sub Section updated successfully!' });
    } catch (error) {
      res.status(500).json({ error: error.message, message: 'Error updating sub section' }); // Added separate message key
    }
  } {
    // res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export default authMiddleware(handler);
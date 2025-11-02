import mongoose from 'mongoose';
import { InProcessProduct } from '../../models/InProcessProduct';
import { FinalProduct } from '../../models/FinalProduct';
import connectToDatabase from '../../lib/mongodb';
import moment from 'moment-timezone';
import { authMiddleware } from './common/common.services';
import { WorkRecord } from '../../models/work_records';

// Get aggregated data for production flow
export const getProductionFlowData = async (req, res) => {
  await connectToDatabase();
  try {
    const company = req.userData?.company;
    const { fromDate, toDate, sections, items } = req.query;
    
    let dateQuery = {};
    if (fromDate && toDate) {
      dateQuery = {
        $gte: new Date(moment(fromDate).tz('IST').startOf('day').toISOString()),
        $lte: new Date(moment(toDate).tz('IST').endOf('day').toISOString()),
      };
    } else if (fromDate) {
      dateQuery = { $gte: new Date(moment(fromDate).tz('IST').startOf('day').toISOString()) };
    } else if (toDate) {
      dateQuery = { $lte: new Date(moment(toDate).tz('IST').endOf('day').toISOString()) };
    }

    // Build base query
    let baseQuery = { isDeleted: false, company };
    if (Object.keys(dateQuery).length > 0) {
      baseQuery.createdAt = dateQuery;
    }

    // Parse items filter
    let itemsFilter = null;
    if (items) {
      itemsFilter = { $in: items.split(',').map(id => new mongoose.Types.ObjectId(id)) };
    }

    // 1. Get In-Process Products (Manufacturing to Handwork)
    let inProcessQuery = { ...baseQuery };
    if (itemsFilter) inProcessQuery.item = itemsFilter;
    
    const inProcessCounts = await InProcessProduct.aggregate([
      { $match: inProcessQuery },
      { 
        $group: { 
          _id: { item: "$item", item_name: "$item_name" },
          totalPiece: { $sum: "$piece" },
          records: { $sum: 1 }
        } 
      },
      { $sort: { "_id.item_name": 1 } }
    ]);

    // 2. Get Section-wise Work Records (Items in handwork sections)
    let sectionsArray = [];
    if (sections) {
      sectionsArray = sections.split(',').map(id => new mongoose.Types.ObjectId(id));
    }

    let sectionQuery = { ...baseQuery };
    if (itemsFilter) sectionQuery.item = itemsFilter;
    if (sectionsArray.length > 0) sectionQuery.section = { $in: sectionsArray };

    const sectionWiseCounts = await WorkRecord.aggregate([
      { $match: sectionQuery },
      {
        $group: {
          _id: {
            section: "$section",
            section_name: "$section_name",
            item: "$item",
            item_name: "$item_name"
          },
          totalPiece: { $sum: "$piece" },
          records: { $sum: 1 }
        }
      },
      { $sort: { "_id.section_name": 1, "_id.item_name": 1 } }
    ]);

    // 3. Get Final Products (Completed items)
    let finalProductQuery = { ...baseQuery };
    if (itemsFilter) finalProductQuery.item = itemsFilter;

    const finalProductCounts = await FinalProduct.aggregate([
      { $match: finalProductQuery },
      {
        $group: {
          _id: { item: "$item", item_name: "$item_name" },
          totalPiece: { $sum: "$piece" },
          records: { $sum: 1 }
        }
      },
      { $sort: { "_id.item_name": 1 } }
    ]);

    // Get unique sections from work records for filtering
    const availableSections = await WorkRecord.aggregate([
      { $match: { isDeleted: false, company } },
      { 
        $group: { 
          _id: { section: "$section", section_name: "$section_name" }
        } 
      },
      { $sort: { "_id.section_name": 1 } }
    ]);

    res.status(200).json({
      inProcess: inProcessCounts,
      sections: sectionWiseCounts,
      finalProduct: finalProductCounts,
      availableSections: availableSections.map(s => ({ _id: s._id.section, name: s._id.section_name }))
    });
  } catch (error) {
    console.error('Error fetching production flow data:', error);
    res.status(400).json({ error: error.message });
  }
};

// Export the API handler
async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return getProductionFlowData(req, res);
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default authMiddleware(handler);


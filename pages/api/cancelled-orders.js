import CancelledOrder from '../../models/CancelledOrder';
import CompanyEmailMapping from '../../models/CompanyEmailMapping';
import { authMiddleware } from './common/common.services';

async function handler(req, res) {
  const { method } = req;

  try {
    const user = req.userData;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (method === 'POST') {
      const { orders, startDate, endDate } = req.body; // Array of { companyName, sku, quantity, email } and date range

      if (!orders || !Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({ message: 'Orders array is required' });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }

      // Parse dates in local timezone (YYYY-MM-DD format)
      const parseLocalDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed
        date.setHours(0, 0, 0, 0);
        return date;
      };
      
      // Validate dates are not in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const start = parseLocalDate(startDate);
      const end = parseLocalDate(endDate);
      
      if (start > end) {
        return res.status(400).json({ message: 'Start date must be before or equal to end date' });
      }
      
      if (start > today || end > today) {
        return res.status(400).json({ message: 'Cannot upload data for future dates' });
      }

      // Use the parsed dates directly (already in local timezone)
      const startDateObj = new Date(start);
      const endDateObj = new Date(end);
      
      // Create one record per order with date range (no duplicates)
      const ordersToInsert = orders.map(order => ({
        companyName: order.companyName.trim(),
        sku: order.sku.trim(),
        quantity: Number(order.quantity) || 0,
        email: order.email?.trim().toLowerCase() || '',
        startDate: startDateObj,
        endDate: endDateObj,
        uploadedDate: new Date(),
        uploadedBy: user._id,
        uploadedByName: user.name || user.username,
      }));

      console.log('Inserting orders with startDate:', start.toISOString(), 'endDate:', end.toISOString());
      
      const result = await CancelledOrder.insertMany(ordersToInsert, { ordered: false });
      console.log('Inserted orders count:', result.length);
      if (result.length > 0) {
        const firstOrder = result[0].toObject ? result[0].toObject() : result[0];
        console.log('First inserted order startDate:', firstOrder.startDate, 'endDate:', firstOrder.endDate);
      }

      return res.status(201).json({ 
        success: true, 
        message: `Successfully uploaded ${result.length} cancelled orders for date range ${startDate} to ${endDate}`,
        count: result.length
      });
    }

    if (method === 'GET') {
      const { companyName, sku, startDate, endDate } = req.query;

      const query = { isDeleted: false };
      if (companyName) query.companyName = { $regex: companyName, $options: 'i' };
      if (sku) query.sku = { $regex: sku, $options: 'i' };
      
      // Parse dates in local timezone
      const parseLocalDate = (dateStr) => {
        if (!dateStr) return null;
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed
        date.setHours(0, 0, 0, 0);
        return date;
      };
      
      // Filter by date range overlap: find records where the stored range overlaps with the requested range
      if (startDate || endDate) {
        const filterStart = startDate ? parseLocalDate(startDate) : new Date(1970, 0, 1);
        const filterEnd = endDate ? parseLocalDate(endDate) : new Date(2099, 11, 31);
        filterEnd.setHours(23, 59, 59, 999);
        
        // Handle both old schema (selectedDate) and new schema (startDate/endDate)
        const dateConditions = {
          $or: [
            // New schema: date range overlap
            {
              startDate: { $exists: true, $ne: null },
              endDate: { $exists: true, $ne: null },
              $and: [
                { startDate: { $lte: filterEnd } },
                { endDate: { $gte: filterStart } }
              ]
            },
            // Old schema: single selectedDate within range
            {
              selectedDate: { $exists: true, $ne: null },
              selectedDate: { $gte: filterStart, $lte: filterEnd }
            }
          ]
        };
        
        query.$and = query.$and || [];
        query.$and.push(dateConditions);
      }

      const orders = await CancelledOrder.find(query)
        .sort({ startDate: -1, selectedDate: -1, uploadedDate: -1 })
        .limit(1000)
        .lean();

      return res.status(200).json({ success: true, orders });
    }

    if (method === 'DELETE') {
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }

      // Parse dates in local timezone
      const parseLocalDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed
        date.setHours(0, 0, 0, 0);
        return date;
      };
      
      const deleteStart = parseLocalDate(startDate);
      const deleteEnd = parseLocalDate(endDate);
      deleteEnd.setHours(23, 59, 59, 999);

      // Delete records where the date range overlaps with the delete range
      const result = await CancelledOrder.updateMany(
        {
          $and: [
            { startDate: { $lte: deleteEnd } },
            { endDate: { $gte: deleteStart } }
          ]
        },
        { isDeleted: true }
      );

      return res.status(200).json({ 
        success: true, 
        message: `Deleted ${result.modifiedCount} cancelled orders for date range ${startDate} to ${endDate}`,
        count: result.modifiedCount
      });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error) {
    console.error('Cancelled orders error:', error);
    return res.status(500).json({ message: 'Error processing request', error: String(error) });
  }
}

export default authMiddleware(handler);


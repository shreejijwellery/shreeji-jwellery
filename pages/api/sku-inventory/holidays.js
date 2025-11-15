import { authMiddleware } from '../common/common.services';
import Holiday from '../../../models/Holiday';
import Company from '../../../models/company';
import { USER_ROLES } from '../../../lib/constants';
import connectToDatabase from '../../../lib/mongodb';

// Helper function to extract YYYY-MM-DD from various date formats
function extractDateString(dateInput) {
    if (!dateInput) return null;
    
    // Convert to string if it's not already
    const dateStr = String(dateInput).trim();
    
    // If it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    // If it's an ISO timestamp (YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ssZ)
    if (dateStr.includes('T')) {
        const datePart = dateStr.split('T')[0];
        // Validate it's in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            return datePart;
        }
    }
    
    // Try to parse as Date and extract YYYY-MM-DD
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    } catch (e) {
        console.error('Error parsing date:', dateStr, e);
    }
    
    console.warn('Could not extract date from:', dateInput);
    return null;
}

async function handler(req, res) {
    await connectToDatabase();
    
    const user = req.userData;
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check permissions
    if (![USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.ADMINISTRATOR].includes(user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
    }

    const company = await Company.findById(user.company).lean();
    if (!company) {
        return res.status(404).json({ message: 'Company not found' });
    }

    if (!company.featureFlags?.isExtractSKU) {
        return res.status(403).json({ message: 'SKU feature is disabled for your company' });
    }

    // GET - Fetch holidays for a date range
    if (req.method === 'GET') {
        try {
            const { startDate, endDate } = req.query;

            const query = {
                company: user.company,
                isDeleted: false
            };

            // Date filter - use UTC dates to avoid timezone issues
            if (startDate || endDate) {
                query.date = {};
                const normalizedStartDate = extractDateString(startDate);
                const normalizedEndDate = extractDateString(endDate);
                
                if (normalizedStartDate) {
                    const [year, month, day] = normalizedStartDate.split('-').map(Number);
                    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
                    query.date.$gte = start;
                }
                if (normalizedEndDate) {
                    const [year, month, day] = normalizedEndDate.split('-').map(Number);
                    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
                    query.date.$lte = end;
                }
            }

            const holidays = await Holiday.find(query)
                .sort({ date: 1 })
                .lean();

            // Convert to array of date strings (YYYY-MM-DD) using UTC to avoid timezone issues
            const holidayDates = holidays.map(h => {
                const date = new Date(h.date);
                // Use UTC methods to get consistent date string
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const day = String(date.getUTCDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            });

            return res.status(200).json({
                success: true,
                holidays: holidayDates
            });
        } catch (error) {
            console.error('Error fetching holidays:', error);
            return res.status(500).json({ message: 'Error fetching holidays', error: error.message });
        }
    }

    // POST - Add a holiday
    if (req.method === 'POST') {
        try {
            const { date } = req.body;

            if (!date) {
                return res.status(400).json({ message: 'Date is required' });
            }

            // Parse date string (handles YYYY-MM-DD or ISO timestamp) and create UTC date
            const normalizedDate = extractDateString(date);
            if (!normalizedDate) {
                return res.status(400).json({ message: 'Invalid date format' });
            }
            
            const [year, month, day] = normalizedDate.split('-').map(Number);
            const holidayDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
            
            // Use date range to check for existing holidays (handles timezone differences)
            const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
            const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

            // Check if holiday already exists
            const existing = await Holiday.findOne({
                company: user.company,
                date: {
                    $gte: startOfDay,
                    $lte: endOfDay
                },
                isDeleted: false
            });

            if (existing) {
                return res.status(200).json({
                    success: true,
                    message: 'Holiday already exists',
                    holiday: existing
                });
            }

            const holiday = await Holiday.create({
                company: user.company,
                date: holidayDate,
                createdBy: user._id
            });

            return res.status(201).json({
                success: true,
                message: 'Holiday added successfully',
                holiday: holiday
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(200).json({
                    success: true,
                    message: 'Holiday already exists'
                });
            }
            console.error('Error adding holiday:', error);
            return res.status(500).json({ message: 'Error adding holiday', error: error.message });
        }
    }

    // DELETE - Remove a holiday
    if (req.method === 'DELETE') {
        try {
            const { date } = req.query;

            if (!date) {
                return res.status(400).json({ message: 'Date is required' });
            }

            // Parse date string (handles YYYY-MM-DD or ISO timestamp) and create UTC date
            const normalizedDate = extractDateString(date);
            if (!normalizedDate) {
                return res.status(400).json({ message: 'Invalid date format' });
            }
            
            const [year, month, day] = normalizedDate.split('-').map(Number);
            const holidayDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

            // Use date range query to handle timezone differences
            const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
            const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

            const result = await Holiday.updateOne(
                {
                    company: user.company,
                    date: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    },
                    isDeleted: false
                },
                {
                    $set: { isDeleted: true }
                }
            );

            if (result.matchedCount === 0) {
                // Try to find any holidays for debugging
                const allHolidays = await Holiday.find({
                    company: user.company,
                    isDeleted: false
                }).limit(5).lean();
                
                console.log('Holiday not found. Looking for date:', holidayDate);
                console.log('Sample holidays in DB:', allHolidays.map(h => ({
                    date: h.date,
                    dateStr: new Date(h.date).toISOString().split('T')[0]
                })));
                
                return res.status(404).json({ 
                    message: 'Holiday not found',
                    debug: {
                        requestedDate: date,
                        parsedDate: holidayDate.toISOString(),
                        startOfDay: startOfDay.toISOString(),
                        endOfDay: endOfDay.toISOString()
                    }
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Holiday removed successfully'
            });
        } catch (error) {
            console.error('Error removing holiday:', error);
            return res.status(500).json({ 
                message: 'Error removing holiday', 
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}

export default authMiddleware(handler);


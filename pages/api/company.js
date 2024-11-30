import connectToDatabase from '../../lib/mongodb';
import Company from '../../models/company';
import mongoose from 'mongoose';    
const handler = async (req, res) => {
    await connectToDatabase();
    if (req.method === 'POST') {
        const { companyName, address } = req.body; // Assuming company has a name and address

        if (!companyName ) {
            return res.status(400).json({ message: 'Name is required' });
        }
        const company = new Company({ companyName: companyName, address });
        await company.save();
        return res.status(201).json(company);
       
    }

    // Handle other HTTP methods (GET, PUT, DELETE) if needed
    return res.status(405).json({ message: 'Method not allowed' });
}

export default handler;
// pages/api/workers/index.js
import axios from 'axios';
import connectToDatabase from '../../../lib/mongodb';
import Worker from '../../../models/workers';
import { authMiddleware } from '../common/common.services';

async function validateBankDetails( bank_ifsc){
    try{
        const bank = await axios.get(`https://ifsc.razorpay.com/${bank_ifsc}`);
        if(!bank?.data){
            return false;
        }
        return bank?.data;
    }catch(error){
        return false;
    }
}
async function handler(req, res) {
    await connectToDatabase();

    if (req.method === 'GET') {
        const company = req.userData?.company;
        const workers = await Worker.find({ isDeleted: false, company });
        return res.status(200).json(workers);
    }

    if (req.method === 'POST') {
        const {_id, company} = req.userData;
        const { name, lastname, mobile_no, address, bank_account_no, bank_ifsc, bank_account_holder_name } = req.body;
        let bank_name = '';
        let bank_branch = '';
        if(bank_ifsc){
            const bank = await validateBankDetails(bank_ifsc);
            if(!bank){
                return res.status(400).json({ message: 'Invalid Bank IFSC' });
            }
            bank_name = bank.BANK;
            bank_branch = bank.BRANCH;
        }
        const worker = new Worker({ name, lastname, mobile_no, address, lastModifiedBy: _id, company, bank_account_no, bank_name, bank_branch, bank_ifsc, bank_account_holder_name });
        await worker.save();
        return res.status(201).json(worker);
    }

    if (req.method === 'PUT') {
        const userId = req.userData;
        const { _id, name, lastname, mobile_no, address, bank_account_no, bank_ifsc, bank_account_holder_name } = req.body;
        let bank_name = '';
        let bank_branch = '';
        if(bank_ifsc){
            const bank = await validateBankDetails(bank_ifsc);
            if(!bank){
                return res.status(400).json({ message: 'Invalid Bank IFSC' });
            }
            bank_name = bank.BANK;
            bank_branch = bank.BRANCH;
        }
        const updatedWorker = await Worker.findByIdAndUpdate(_id, { name, lastname, mobile_no, address, lastModifiedBy: userId, bank_account_no, bank_name, bank_branch, bank_ifsc, bank_account_holder_name }, { new: true });
        if (!updatedWorker) {
            return res.status(404).json({ message: 'Worker not found' });
        }
        return res.status(200).json(updatedWorker);
    }
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default authMiddleware(handler);
// pages/api/workers/index.js
import axios from 'axios';
import connectToDatabase from '../../../lib/mongodb';
import Worker from '../../../models/workers';
import { authMiddleware } from '../common/common.services';
import { USER_ROLES, PERMISSIONS } from '../../../lib/constants';
import User from '../../../models/users';

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
        const { role, _id } = req.userData;
        let query = { isDeleted: false, company };
        
        // If user is a manager (not admin or administrator), filter by assignedManager
        if (role !== USER_ROLES.ADMIN && role !== USER_ROLES.ADMINISTRATOR) {
            query.assignedManager = _id;
        }
        
        const workers = await Worker.find(query).populate('assignedManager', 'name');
        return res.status(200).json(workers);
    }

    if (req.method === 'POST') {
        const {_id, company, role} = req.userData;
        const { name, lastname, mobile_no, address, bank_account_no, bank_ifsc, bank_account_holder_name, assignedManager } = req.body;
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
        
        // Determine assignedManager based on user role
        let managerId = assignedManager;
        if (role !== USER_ROLES.ADMIN && role !== USER_ROLES.ADMINISTRATOR) {
            // Manager creates worker - assign themselves
            managerId = _id;
        } else if (role === USER_ROLES.ADMIN || role === USER_ROLES.ADMINISTRATOR) {
            // Admin creates worker - use provided assignedManager or default to creator
            if (!assignedManager) {
                managerId = _id;
            } else {
                // Validate that assignedManager has WORKER_BILLS permission
                const manager = await User.findById(assignedManager);
                if (!manager || manager.company.toString() !== company.toString()) {
                    return res.status(400).json({ message: 'Invalid manager selected' });
                }
                if (manager.role !== USER_ROLES.ADMIN && manager.role !== USER_ROLES.ADMINISTRATOR && 
                    !manager.permissions?.includes(PERMISSIONS.WORKER_BILLS)) {
                    return res.status(400).json({ message: 'Selected user does not have worker permission' });
                }
            }
        }
        
        const worker = new Worker({ 
            name, 
            lastname, 
            mobile_no, 
            address, 
            lastModifiedBy: _id, 
            company, 
            bank_account_no, 
            bank_name, 
            bank_branch, 
            bank_ifsc, 
            bank_account_holder_name,
            assignedManager: managerId
        });
        await worker.save();
        const populatedWorker = await Worker.findById(worker._id).populate('assignedManager', 'name');
        return res.status(201).json(populatedWorker);
    }

    if (req.method === 'PUT') {
        const {_id: userId, company, role} = req.userData;
        const { _id, name, lastname, mobile_no, address, bank_account_no, bank_ifsc, bank_account_holder_name, assignedManager } = req.body;
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
        
        // Check if worker exists and belongs to company
        const existingWorker = await Worker.findById(_id);
        if (!existingWorker || existingWorker.company.toString() !== company.toString()) {
            return res.status(404).json({ message: 'Worker not found' });
        }
        
        // If manager, ensure they can only edit their own workers
        if (role !== USER_ROLES.ADMIN && role !== USER_ROLES.ADMINISTRATOR) {
            if (existingWorker.assignedManager.toString() !== userId.toString()) {
                return res.status(403).json({ message: 'Unauthorized: You can only edit workers assigned to you' });
            }
        }
        
        // Handle assignedManager update for admin
        let updateData = { name, lastname, mobile_no, address, lastModifiedBy: userId, bank_account_no, bank_name, bank_branch, bank_ifsc, bank_account_holder_name };
        if (role === USER_ROLES.ADMIN || role === USER_ROLES.ADMINISTRATOR) {
            if (assignedManager) {
                // Validate that assignedManager has WORKER_BILLS permission
                const manager = await User.findById(assignedManager);
                if (!manager || manager.company.toString() !== company.toString()) {
                    return res.status(400).json({ message: 'Invalid manager selected' });
                }
                if (manager.role !== USER_ROLES.ADMIN && manager.role !== USER_ROLES.ADMINISTRATOR && 
                    !manager.permissions?.includes(PERMISSIONS.WORKER_BILLS)) {
                    return res.status(400).json({ message: 'Selected user does not have worker permission' });
                }
                updateData.assignedManager = assignedManager;
            }
        }
        
        const updatedWorker = await Worker.findByIdAndUpdate(_id, updateData, { new: true });
        if (!updatedWorker) {
            return res.status(404).json({ message: 'Worker not found' });
        }
        const populatedWorker = await Worker.findById(updatedWorker._id).populate('assignedManager', 'name');
        return res.status(200).json(populatedWorker);
    }
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default authMiddleware(handler);
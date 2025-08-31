import { USER_ROLES } from '../../lib/constants';
import connectToDatabase from '../../lib/mongodb';
import User from '../../models/users';
import bcrypt from 'bcryptjs';
import { authMiddleware, isUserNameAvailable } from './common/common.services';

const handler = async (req, res) => {
  const { method } = req;

  await connectToDatabase();
  const userId = req.userData?._id;
  const company = req.userData?.company;
  if (method === 'POST') {
    const { name, mobileNumber, username, password, role, permissions } = req.body;

    try {

        const updates = {};

        if(name){
            updates.name = name;
        }
        if(mobileNumber){
            updates.mobileNumber = mobileNumber;
        }
        if(username){
           const isUserNameAvailable1 = await isUserNameAvailable(username);
           if(!isUserNameAvailable1){
            return res.status(400).json({ message: 'Username already exists' });
           }
            updates.username = username;
        }
        if(role){
            updates.role = role;
        }
        if(permissions){
            updates.permissions = permissions;
        }
        if (password) {
            updates.password = await bcrypt.hash(password, 10);
        }
        updates.company = company;

        const updatedUser = await User.create(updates);
        delete updatedUser.password;
        

      res.status(201).json({ message: 'User created successfully', data: updatedUser });
    } catch (error) {
      res.status(500).json({ message: 'Error creating user', error });
    }
  } 
  else if (method === 'PUT') {
    const { name, mobileNumber, username, password, oldPassword, role, permissions, _id } = req.body;

    if(!_id){
      return res.status(400).json({ message: 'User id is required' });
    }

    try {

        const updates = {};

        if(name){
            updates.name = name;
        }
        if(mobileNumber){
            updates.mobileNumber = mobileNumber;
        }
        if(username){
            const isUserNameAvailable1 = await isUserNameAvailable(username, _id);
            if(!isUserNameAvailable1){
                return res.status(400).json({ message: 'Username already exists' });
            }
            updates.username = username;
        }
        if(role){
            updates.role = role;
        }
        if(permissions){
            updates.permissions = permissions;
        }
        if (password) {
            if(!oldPassword){
                return res.status(400).json({ message: 'Old password is required' });
            }
            const user = await User.findById(_id);
            const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
            if(!isPasswordMatch){
                return res.status(400).json({ message: 'Old password is incorrect' });
            }
            updates.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await User.findByIdAndUpdate(_id, updates, { new: true });
        delete updatedUser.password;
        

      res.status(201).json({ message: 'User created successfully', data: updatedUser });
    } catch (error) {
      res.status(500).json({ message: 'Error creating user', error });
    }
  }else if (method === 'GET') {
    const users = await User.find({role : {$nin : [USER_ROLES.ADMIN, USER_ROLES.ADMINISTRATOR]}, isDeleted : {$ne : true}},{password : 0});
    res.status(200).json({ message: 'Users fetched successfully', data: users });
  }
  else if (method === 'DELETE') {
    const { _id } = req.body;
    await User.findByIdAndUpdate(_id, {isDeleted : true});
    res.status(200).json({ message: 'User deleted successfully' });
  }
  else {
    res.setHeader('Allow', ['POST', 'PUT', 'GET', 'DELETE']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export default authMiddleware(handler);
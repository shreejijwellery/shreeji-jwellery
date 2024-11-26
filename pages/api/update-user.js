import connectToDatabase from '../../lib/mongodb';
import User from '../../models/users';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  const { method } = req;

  await connectToDatabase();

  if (method === 'POST') {
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
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}

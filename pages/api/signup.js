import connectToDatabase from '../../lib/mongodb';
import User from '../../models/users';
import Company from '../../models/company';
import bcrypt from 'bcryptjs';
import { isUserNameAvailable } from './common/common.services';

export default async function handler(req, res) {
  const { method } = req;

  await connectToDatabase();

  if (method === 'POST') {
    const { name, mobileNumber, username, password, role, permissions, companyName, address } = req.body;

    if (!name || !mobileNumber || !username || !password || !role || !permissions || !companyName ) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      let company;
      const isUsernameAvailable = await isUserNameAvailable(username);
      if(!isUsernameAvailable){
        return res.status(400).json({ message: 'Username already exists' });
      }
      if(companyName){
        const newCompany = new Company({ companyName, address });
        company = await newCompany.save();
      }
      const newUser = new User({
        name,
        mobileNumber,
        username,
        password: hashedPassword,
        role,
        permissions,
        company: company._id,
      });

      const user = await newUser.save();

      res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error creating user', error });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}

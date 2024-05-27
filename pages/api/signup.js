import connectToDatabase from '../../lib/mongodb';
import User from '../../models/users';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  const { method } = req;

  await connectToDatabase();

  if (method === 'POST') {
    const { name, mobileNumber, username, password, role, permissions } = req.body;

    if (!name || !mobileNumber || !username || !password || !role || !permissions) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        name,
        mobileNumber,
        username,
        password: hashedPassword,
        role,
        permissions,
      });

      await newUser.save();

      res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error creating user', error });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}

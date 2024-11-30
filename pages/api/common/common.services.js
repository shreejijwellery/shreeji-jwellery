import jwt from 'jsonwebtoken';


import users from '../../../models/users';


export const authMiddleware = (handler) => {
    return async (req, res) => {
        const token = req.headers.authorization?.split(' ')[1]; // Extract token from Authorization header

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        try {
            const userData = jwt.verify(token, process.env.JWT_SECRET); // Verify and decode the token
            
            const user = await users.findById(userData.userId).lean();
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            delete user.password;
            req.userData = user; // Attach user data to the request object
        } catch (error) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        return handler(req, res); // Call the next handler
    };
};
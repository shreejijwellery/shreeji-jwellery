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

export const isUserNameAvailable = async (username, _id) => {
    if(!_id){
        const user = await users.findOne({ username });
        return user ? false : true;
    }
    const user = await users.findOne({ username, _id: { $ne: _id } });
    return user ? false : true;
}
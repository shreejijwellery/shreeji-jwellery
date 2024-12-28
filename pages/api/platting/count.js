import mongoose from 'mongoose';
import { Platting } from '../../../models/Platting'; // Adjust the import path as necessary
import connectToDatabase from '../../../lib/mongodb';
import moment from 'moment-timezone';
import { authMiddleware } from '../common/common.services';

export const getPlattingCounts = async (req, res) => {
  await connectToDatabase();
  const company = req.userData?.company;
  const {  fromDate, toDate, type } = req.query;
  let query = { isDeleted: false, company };
  if (fromDate && toDate) {
    query.createdAt = {
      $gte: new Date(moment(fromDate).tz('IST').startOf('day').toISOString()),
      $lte: new Date(moment(toDate).tz('IST').endOf('day').toISOString()),
    };
  } else if (fromDate) {
    query.createdAt = { $gte: new Date(moment(fromDate).tz('IST').startOf('day').toISOString()  ) };
  } else if (toDate) {
    query.createdAt = { $lte: new Date(moment(toDate).tz('IST').endOf('day').toISOString()) };
  }
  if (type) query.type = type;
  

  const counts = await Platting.aggregate([ { $match: query }, { $group: { _id: '$type', count: { $sum: 1 } } }]);
  let output = {};
  counts.forEach(count => {
    output[count._id] = count.count;
  });
  res.json(output);
};

const getTotalWeight = async (req, res) => {
  await connectToDatabase();
  const company = req.userData?.company;
  const {  fromDate, toDate, type } = req.body;
  let query = { isDeleted: false, company };
  if (fromDate && toDate) {
    query.createdAt = {
      $gte: new Date(moment(fromDate).tz('IST').startOf('day').toISOString()),
      $lte: new Date(moment(toDate).tz('IST').endOf('day').toISOString()),
    };
  } else if (fromDate) {
    query.createdAt = { $gte: new Date(moment(fromDate).tz('IST').startOf('day').toISOString()  ) };
  } else if (toDate) {
    query.createdAt = { $lte: new Date(moment(toDate).tz('IST').endOf('day').toISOString()) };
  }
  if (type) query.type = type;
  

  const counts = await Platting.aggregate([ { $match: query }, { $group: { _id: '$type', count: { $sum: '$weight' } } }]);
  let output = {};
  counts.forEach(count => {
    output[count._id] = count.count;
  });
  res.json(output);
};

async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return getPlattingCounts(req, res);
    case 'POST':
      return getTotalWeight(req, res);
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
export default authMiddleware(handler);

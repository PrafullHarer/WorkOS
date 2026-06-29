const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const resetDatabase = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Error: MONGODB_URI not found in env variables.');
    process.exit(1);
  }

  console.log('Connecting to database to reset...');
  try {
    await mongoose.connect(uri, {
      dbName: 'taskmanager'
    });
    console.log('Connected. Dropping database...');
    await mongoose.connection.db.dropDatabase();
    console.log('Database successfully reset and dropped!');
  } catch (err) {
    console.error('Reset database failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
    process.exit(0);
  }
};

resetDatabase();

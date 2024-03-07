import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const dbURL = process.env.mongoURI || '';

export /**
 *
 *
 */
const connectDB = async () => {
    try {
        await mongoose.connect(dbURL, {
        });
        console.log('MongoDB connected...');
    } catch (err: unknown) {
        console.error(err);
        process.exit(1);
    }
};


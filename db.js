import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;
import {Sequelize, DataTypes } from 'sequelize';

if (fs.existsSync('.env')) {
  config();
}



const useSSL = process.env.PG_SSL === 'true';


const ssl = useSSL
  ? {
      rejectUnauthorized: true,
      ca: fs.readFileSync(path.resolve(process.env.PG_SSL_CA || 'certs/CA.crt')).toString(),
      key: fs.readFileSync(path.resolve(process.env.PG_SSL_KEY || 'certs/server.key')).toString(),
      cert: fs.readFileSync(path.resolve(process.env.PG_SSL_CERT || 'certs/server.crt')).toString(),
      servername: process.env.PG_SERVERNAME || 'localhost',
    }
  : false;

// console.log(process.env.PG_HOST);


const sequelize = new Sequelize(process.env.PG_DATABASE, process.env.PG_USER, process.env.PG_PASSWORD, {
  host: process.env.PG_HOST, // use your actual DB host
  dialect: 'postgres',
  dialectOptions: {
    ssl: ssl,
  },
  logging: false, // optional
});

const Book = sequelize.define('Book', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,  // Adjust if title can be null
  },
  ISBN: {
    type: DataTypes.TEXT,
    allowNull: true, // Adjust if ISBN can be null or is required
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true, // Adjust if image_url can be null or is required
  },
  rating: {
    type: DataTypes.TEXT,
    allowNull: true, // Adjust if rating can be null
  },
  read_date: {
    type: DataTypes.DATEONLY, // DATE in SQL maps to DATEONLY in Sequelize
    allowNull: true, // Adjust if read_date can be null
  },
  created_at: {
    type: DataTypes.DATE, // DATETIME in SQL maps to DATE in Sequelize
    defaultValue: Sequelize.NOW, // Automatically sets the current timestamp when created
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW, // Automatically sets the current timestamp when updated
    allowNull: false,
  },
}, {
  tableName: 'books',  // Ensure Sequelize uses the exact table name
  timestamps: false,   // Disables Sequelize's automatic `createdAt` / `updatedAt` columns
  hooks: {
    beforeUpdate: (book) => {
      book.updated_at = new Date(); // Automatically update `updated_at` before saving
    }
  }
});

const Review = sequelize.define('Review', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    review: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    book_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'books', // name of the referenced table
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }
  }, {
    tableName: 'reviews',
    timestamps: false
  });

export async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    await sequelize.sync({ alter: true });
    console.log('✅ Database & tables synced (migrated).');
  } catch (error) {
    console.error('❌ Unable to connect or sync with the database:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Connection closed.');
  }
};

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432,
  ssl: ssl,
});

export default pool;
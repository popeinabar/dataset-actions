// Import necessary packages
const fs = require('fs');
require("dotenv").config();
const { parse } = require('csv-parse');
const path = require('path');
const fetchDataFromKaggle = require('./fetchdata.ts').fetchDataFromKaggle;

const axios = require('axios');
const { Sequelize } = require('sequelize');

// Create Sequelize 
const sequelize = new Sequelize('kaggle', 'root', 'root', {
    host: 'localhost',
    port:3333,
    dialect: 'mysql',
    logging:false,
  })
  
// Define the model for the names table
const Name = sequelize.define('Name', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  sex: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});

// Read and parse the CSV file
const addFileToDb = async (extractionDir) => {
  let isFirstRow = true;
  let batchSize = 0;
  let batchData = [];

  await new Promise((resolve, reject) => {
      fs.createReadStream(path.join(extractionDir, 'babyNamesUSYOB-full.csv'))
          .pipe(parse({ delimiter: ',' }))
          .on('data', async (row) => {
              if (isFirstRow) {
                  isFirstRow = false;
                  return;
              }

              const [, name, sex] = row;
              batchData.push({ name, sex });
              batchSize++;

              // If batch size reaches 500, insert data into the database
              if (batchSize === 500) {
                  try {
                      await Name.bulkCreate(batchData);
                      console.log('Batch inserted successfully.');
                  } catch (error) {
                      console.error('Error inserting data:', error);
                      reject(error);
                  }
                  batchSize = 0;
                  batchData = [];
              }
          })
          .on('end', async () => {
              // Insert remaining data if any
              if (batchSize > 0) {
                  try {
                      await Name.bulkCreate(batchData);
                      console.log('Final batch inserted successfully.');
                  } catch (error) {
                      console.error('Error inserting data:', error);
                      reject(error);
                  }
              }
              console.log('CSV file successfully processed.');
              resolve();
          })
          .on('error', (error) => {
              console.error('Error reading CSV file:', error);
              reject(error);
          });
  });
};


// Function to send data to HubSpot API
async function sendDataToHubSpot() {
    try {
        const accessToken=`${process.env.TOKEN}`//token
      // Fetch data from MySQL database
      const names = await Name.findAll({
        limit: 10,
      });
        
      // Format data for HubSpot API
      const contacts = names.map(name => ({
        properties: {
            "firstname": `${name.name}`,
            "gender": `${name.sex}`
            // Add more properties as needed
          }
      }));
      const contactsData={
        "inputs":contacts,
      }
      // Send data to HubSpot API
      const response = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts/batch/create',
        JSON.stringify(contactsData),
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
        }
      );
      await Name.destroy({//deleting the data from the database once the user is added
        where: {
            // For example, if Name has a primary key id, you can do something like:
            id: names.map(name => name.id)
        }
    });
      console.log('Data sent to HubSpot successfully:', response.data);
    } catch (error) {
      console.error('Error sending data to HubSpot:', error.response.data);
    }
  }
  
  
  // Main function to execute both tasks
  async function main() {
    try {
        const extractionDir = await fetchDataFromKaggle(); // Call fetchDataFromKaggle function
        // const extractionDir = '/Users/ayushraj/Project/collage/interview/plena/kaggle hubspot/extracted'
        console.log(extractionDir)
        console.log("ectractiong of path completed")
        await addFileToDb(extractionDir);
        await sendDataToHubSpot();
    } catch (error) {
        console.error('Error:', error);
    }
}
  
  // Run the main function
  main();
  
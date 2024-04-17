// Import necessary packages
const fs = require('fs');
require("dotenv").config();
const { parse } = require('csv-parse');

const axios = require('axios');
const { Sequelize } = require('sequelize');

// Create Sequelize 
const sequelize = new Sequelize('kaggle', 'root', 'root', {
    host: 'localhost',
    port:3333,
    dialect: 'mysql',
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
const addFileToDb = () => {
    let isFirstRow = true;//skipping the first row
    fs.createReadStream('babyNamesUSYOB-full.csv')
      .pipe(parse({ delimiter: ',' }))//splitting the values
      .on('data', async (row) => {
        if (isFirstRow) {
          isFirstRow = false;
          return; 
        }
        // Extract name and sex from each row
        const [, name, sex,] = row;
    
        // Insert data into the database
        try {
          await Name.create({ name, sex });
        } catch (error) {
          console.error('Error inserting data:', error);
        }
      })
      .on('end', () => {
        console.log('CSV file successfully processed.');
      });
}



// Function to send data to HubSpot API
async function sendDataToHubSpot() {
    try {
        const accessToken=`${process.env.TOKEN}`//token
      // Fetch data from MySQL database
      const names = await Name.findAll({
        limit: 1,
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

    // await addFileToDb()
    await sendDataToHubSpot();

  }
  
  // Run the main function
  main();
  
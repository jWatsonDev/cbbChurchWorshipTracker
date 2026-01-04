/**
 * CSV to JSON Converter for CBB Church Worship Songs
 * 
 * This script converts a CSV file to JSON format.
 * 
 * How to run:
 * 1. Make sure you have Node.js installed
 * 2. Navigate to the project directory in your terminal
 * 3. Run: node csvToJson.js <input-csv-file> <output-json-file>
 * 4. Example: node csvToJson.js CBBChurch_Songs_CSV.csv CBBChurch_Songs.json
 */

const fs = require('fs');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node csvToJson.js <input-csv-file> <output-json-file>');
  console.error('Example: node csvToJson.js CBBChurch_Songs_CSV.csv CBBChurch_Songs.json');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];

// Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file '${inputFile}' not found`);
  process.exit(1);
}

const csv = fs.readFileSync(inputFile, 'utf8');
const lines = csv.trim().split('\n');
const headers = lines[0].split(',').map(h => h.trim());

const songs = [];
for (let i = 1; i < lines.length; i++) {
  const regex = /,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/;
  const values = lines[i].split(regex).map(v => v.replace(/^\"|\"$/g, '').trim());
  
  const entry = {
    date: values[0],
    songs: []
  };
  
  for (let j = 1; j < values.length; j++) {
    if (values[j]) {
      entry.songs.push(values[j]);
    }
  }
  
  songs.push(entry);
}

fs.writeFileSync(outputFile, JSON.stringify(songs, null, 2));
console.log(`Converted ${inputFile} to ${outputFile} successfully`);

const express = require('express');
const AWS = require('aws-sdk');
const app = express();
const port = 8080;

// Configure AWS SDK
AWS.config.update({ region: 'ap-southeast-1' }); // Replace with your region
const s3 = new AWS.S3();

const bucketName = 'valet-key-demo'; // Replace with your bucket name
const objectKey = 'image.png'; // Replace with your image key

// Serve the web app
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Fetch image without Valet Key (via EC2 server)
app.get('/fetch-image', async (req, res) => {
    try {
        const startTime = Date.now();
        const data = await s3.getObject({ Bucket: bucketName, Key: objectKey }).promise();
        const endTime = Date.now();
        res.json({
            image: data.Body.toString(),
            timeTaken: endTime - startTime
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate Valet Key (pre-signed URL)
app.get('/generate-valet-key', (req, res) => {
    const params = {
        Bucket: bucketName,
        Key: objectKey,
        Expires: 60 // URL expires in 60 seconds
    };
    const url = s3.getSignedUrl('getObject', params);
    res.json({ url });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
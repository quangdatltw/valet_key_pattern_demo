
import express from "express";
import cors from "cors";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { v4 as uuid } from "uuid";
import dotenv from "dotenv";
import * as path from "node:path";
import { fileURLToPath } from "url";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config();

const port = 8080;
const s3Client = new S3Client({ region: "ap-southeast-1" });

const app = express();
app.use(express.json());
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


async function generateUploadUrl({ type }) {
    const name = uuid();
    const expiresInMinutes = 1;
    return await createPresignedPost(s3Client, {
        Bucket: "valet-key-demo",
        Key: `${name}`,
        Expires: expiresInMinutes * 60, // the url will only be valid for 1 minute
        Conditions: [["eq", "$Content-Type", type]],
    });
}

app.post("/", async function (req, res) {
    try {
        const type = req.body.type;
        if (!type) {
            return res.status(400).json("invalid request body");
        }
        const data = await generateUploadUrl({ type });
        return res.json(data);
    } catch (e) {
        return res.status(500).json(e.message);
    }
});

app.listen(port, () => {
    console.log(`The Server is running on http://localhost:${port}`);
});

app.get("/presigned-get", async (req, res) => {
    try {
        const key = req.query.key || "image.png";
        console.log(`Generating presigned URL for ${key}`);

        // Make sure your bucket name matches exactly what you set up in AWS
        const bucketName = "valet-key-demo"; // Confirm this is correct

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        console.log(`Generated URL for ${key}`);

        res.json({ url });
    } catch (error) {
        console.error("Error generating presigned URL:", error);
        res.status(500).json({
            error: error.message,
            details: error.stack
        });
    }
});

// Endpoint for server proxy
app.get("/proxy-image", async (req, res) => {
    try {
        const key = req.query.key || "image.png";
        console.log(`Proxying image ${key}`);

        // Make sure your bucket name matches exactly what you set up in AWS
        const bucketName = "valet-key-demo"; // Confirm this is correct

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key
        });

        const response = await s3Client.send(command);
        console.log(`Successfully retrieved ${key}`);

        // Set appropriate headers
        if (response.ContentType) {
            res.set('Content-Type', response.ContentType);
        }

        // Stream the object data to the client
        response.Body.pipe(res);
    } catch (error) {
        console.error("Error proxying image:", error);
        res.status(500).json({
            error: error.message,
            details: error.stack
        });
    }
});
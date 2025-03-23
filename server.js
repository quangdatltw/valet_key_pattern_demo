// server/src/index.ts
import express from "express";
import cors from "cors";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { v4 as uuid } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const port = 8080;
const s3Client = new S3Client({ region: "ap-southeast-1" });

const app = express();
app.use(express.json());
app.use(cors());

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